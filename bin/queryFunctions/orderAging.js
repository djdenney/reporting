const knex = require("../connection");

async function openRates() {
    const response = await knex.raw(
        `SELECT
            subtable.LOCATION_SUB_TYPE_ID AS "Order Stores",
            COUNT(
                CASE
                    WHEN subtable.CREATED_TIMESTAMP > current_timestamp() - INTERVAL 1 DAY THEN 1
                    ELSE NULL
                END
            ) AS 'Open 0-1 day',
            COUNT(
                CASE
                    WHEN subtable.CREATED_TIMESTAMP < current_timestamp() - INTERVAL 1 DAY
                    AND subtable.CREATED_TIMESTAMP > current_timestamp() - INTERVAL 2 DAY THEN 1
                    ELSE NULL
                END
            ) AS 'Open 1-2 day',
            COUNT(
                CASE
                    WHEN subtable.CREATED_TIMESTAMP < current_timestamp() - INTERVAL 2 DAY
                    AND subtable.CREATED_TIMESTAMP > current_timestamp() - INTERVAL 3 DAY THEN 1
                    ELSE NULL
                END
            ) AS 'Open 2-3 day',
            COUNT(
                CASE
                    WHEN subtable.CREATED_TIMESTAMP < current_timestamp() - INTERVAL 3 DAY
                    AND subtable.CREATED_TIMESTAMP > current_timestamp() - INTERVAL 5 DAY THEN 1
                    ELSE NULL
                END
            ) AS 'Open 3-5 day',
            COUNT(
                CASE
                    WHEN subtable.CREATED_TIMESTAMP < current_timestamp() - INTERVAL 5 DAY
                    AND subtable.CREATED_TIMESTAMP > current_timestamp() - INTERVAL 7 DAY THEN 1
                    ELSE NULL
                END
            ) AS 'Open 5-7 day',
            COUNT(
                CASE
                    WHEN subtable.CREATED_TIMESTAMP < current_timestamp() - INTERVAL 7 DAY
                    AND subtable.CREATED_TIMESTAMP > current_timestamp() - INTERVAL 10 DAY THEN 1
                    ELSE NULL
                END
            ) AS 'Open 7-10 day',
            COUNT(
                CASE
                    WHEN subtable.CREATED_TIMESTAMP < current_timestamp() - INTERVAL 10 DAY
                    AND subtable.CREATED_TIMESTAMP > current_timestamp() - INTERVAL 30 DAY THEN 1
                    ELSE NULL
                END
            ) AS 'Open 10-30 day',
            COUNT(
                CASE
                    WHEN subtable.CREATED_TIMESTAMP <= current_timestamp() - INTERVAL 30 DAY THEN 1
                    ELSE NULL
                END
            ) AS 'Open 30+ day'
        FROM
            (
                select
                    oo.ORDER_ID,
                    IL.LOCATION_SUB_TYPE_ID,
                    oo.CREATED_TIMESTAMP -- ool.MIN_FULFILLMENT_STATUS_ID, oor.DELIVERY_METHOD_ID
                from
                    default_order.ORD_ORDER oo
                    inner join default_order.ORD_ORDER_LINE ool on ool.ORDER_PK = oo.PK
                    inner join default_order.ORD_RELEASE oor on oor.ORDER_PK = oo.PK
                    inner join default_order.ORD_RELEASE_LINE orl on orl.ORDER_LINE_ID = ool.ORDER_LINE_ID
                    and orl.RELEASE_PK = oor.PK
                    INNER JOIN default_inventory.INV_LOCATION IL ON IL.LOCATION_ID = oor.SHIP_FROM_LOCATION_ID
                where
                    1 = 1
                    and oo.CREATED_TIMESTAMP >= NOW() - INTERVAL 200 DAY
                    and orl.CANCELLED_QUANTITY + orl.FULFILLED_QUANTITY != orl.QUANTITY
                    and (
                        (
                            IL.LOCATION_SUB_TYPE_ID in ('OwnedWM', '3PL', 'DropShipVendor')
                            and ool.MIN_FULFILLMENT_STATUS_ID < '3600'
                        )
                        or (
                            ool.DELIVERY_METHOD_ID = 'ShipToAddress'
                            and IL.LOCATION_SUB_TYPE_ID = 'StoreRegular'
                            and ool.MIN_FULFILLMENT_STATUS_ID IN ('3000', '3500', '3600')
                        )
                        or (
                            ool.DELIVERY_METHOD_ID = 'PickUpAtStore'
                            and ool.MIN_FULFILLMENT_STATUS_ID < '3600'
                        )
                        or (
                            ool.DELIVERY_METHOD_ID = 'ShipToStore'
                            and oor.DESTINATION_ACTION = 'Merge'
                            and ool.MIN_FULFILLMENT_STATUS_ID < '3600'
                        )
                    )
                group by
                    oo.ORDER_ID,
                    IL.LOCATION_SUB_TYPE_ID,
                    oo.CREATED_TIMESTAMP
            ) as subtable
        WHERE
            1 = 1
        GROUP BY
            subtable.LOCATION_SUB_TYPE_ID`
    )
    console.log(response[0])
}
openRates()