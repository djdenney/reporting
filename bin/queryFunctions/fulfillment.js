const knex = require("../connection");

async function fillRate(days) {
    const response = await knex.raw(
        `SELECT
            SFLI,
            AVG(SFR)
        FROM
            (
                SELECT
                    T1.SFLI,
                    SUM(T1.SFQ) /(SUM(T1.SFQ) + SUM(T1.SCQ)) AS SFR
                FROM
                    (
                        SELECT
                            ORDER_ID,
                            ORDER_LINE_ID,
                            SUM(FULFILLED_QUANTITY) AS SFQ,
                            SUM(CANCELLED_QUANTITY) AS SCQ,
                            IL.LOCATION_SUB_TYPE_ID AS SFLI
                        FROM
                            default_order.ORD_RELEASE_LINE RL
                            INNER JOIN default_order.ORD_RELEASE R ON RL.RELEASE_PK = R.PK
                            INNER JOIN default_inventory.INV_LOCATION IL ON IL.LOCATION_ID = R.SHIP_FROM_LOCATION_ID
                        WHERE
                            RL.CREATED_TIMESTAMP > NOW() - INTERVAL ${days} DAY
                        GROUP BY
                            ORDER_ID,
                            ORDER_LINE_ID,
                            RELEASE_PK,
                            IL.LOCATION_SUB_TYPE_ID
                    ) T1
                GROUP BY
                    T1.SFLI
                HAVING
                    SUM(T1.SFQ) /(SUM(T1.SFQ) + SUM(T1.SCQ)) IS NOT NULL
            ) AS T2
        GROUP BY
            SFLI`
    )
    let result = response[0].map((line) => {
        return {
            "FULFILLMENT_TYPE": Object.values(line)[0],
            "FILL_RATE": Math.floor(Object.values(line)[1] * 10000) / 100
        }
    })
    return result
}

async function storeFirstFillRates(days) {
    const response = await knex.raw(
        `SELECT
            '3PL',
            COUNT(*) / (
                COUNT(*) + (
                    select
                        COUNT(DISTINCT oli.PK)
                    from
                        default_order.ORD_ORDER o
                        inner join default_order.ORD_ORDER_LINE oli on oli.ORDER_PK = o.PK
                        inner join default_order.ORD_RELEASE oor on oor.ORDER_PK = o.PK
                        inner join default_order.ORD_RELEASE_LINE orl on orl.RELEASE_PK = oor.PK
                        AND orl.ORDER_LINE_ID = oli.ORDER_LINE_ID
                        inner join default_inventory.INV_LOCATION il on il.LOCATION_ID = oor.SHIP_FROM_LOCATION_ID
                    WHERE
                        1 = 1
                        and oor.DESTINATION_ACTION in ('Delivery', 'Merge')
                        and o.CREATED_TIMESTAMP >= NOW() - INTERVAL ${days} DAY -- and o.CREATED_TIMESTAMP <= NOW() - INTERVAL 20 DAY
                        and oli.DELIVERY_METHOD_ID not in ('PickUpAtStore')
                        and oli.IS_RETURN != 1
                        and oli.IS_EVEN_EXCHANGE != 1
                        and il.LOCATION_SUB_TYPE_ID = '3PL'
                        and (orl.CANCELLED_QUANTITY > 0)
                )
            ) * 100 as "% of First Pick Fulfillment 1 Day"
        FROM
            (
                SELECT
                    o.ORDER_ID,
                    oli.ORDER_LINE_ID,
                    oli.ITEM_ID,
                    SUM(orl.CANCELLED_QUANTITY),
                    COUNT(DISTINCT oor.RELEASE_ID) counts
                from
                    default_order.ORD_ORDER o
                    inner join default_order.ORD_ORDER_LINE oli on oli.ORDER_PK = o.PK
                    inner join default_order.ORD_RELEASE oor on oor.ORDER_PK = o.PK
                    inner join default_order.ORD_RELEASE_LINE orl on orl.RELEASE_PK = oor.PK
                    AND orl.ORDER_LINE_ID = oli.ORDER_LINE_ID
                    inner join default_inventory.INV_LOCATION il on il.LOCATION_ID = oor.SHIP_FROM_LOCATION_ID
                WHERE
                    1 = 1
                    and oor.DESTINATION_ACTION in ('Delivery', 'Merge')
                    and o.CREATED_TIMESTAMP >= NOW() - INTERVAL ${days} DAY -- and o.CREATED_TIMESTAMP <= NOW() - INTERVAL 20 DAY
                    and oli.DELIVERY_METHOD_ID not in ('PickUpAtStore')
                    and oli.IS_RETURN != 1
                    and oli.IS_EVEN_EXCHANGE != 1
                    and il.LOCATION_SUB_TYPE_ID = '3PL'
                group by
                    o.ORDER_ID,
                    oli.ORDER_LINE_ID,
                    oli.ITEM_ID
                having
                    SUM(orl.CANCELLED_QUANTITY) = 0
            ) subtable
        WHERE
            1 = 1
        UNION
        SELECT
            'DropShipVendor',
            COUNT(*) / (
                COUNT(*) + (
                    select
                        COUNT(DISTINCT oli.PK)
                    from
                        default_order.ORD_ORDER o
                        inner join default_order.ORD_ORDER_LINE oli on oli.ORDER_PK = o.PK
                        inner join default_order.ORD_RELEASE oor on oor.ORDER_PK = o.PK
                        inner join default_order.ORD_RELEASE_LINE orl on orl.RELEASE_PK = oor.PK
                        AND orl.ORDER_LINE_ID = oli.ORDER_LINE_ID
                        inner join default_inventory.INV_LOCATION il on il.LOCATION_ID = oor.SHIP_FROM_LOCATION_ID
                    WHERE
                        1 = 1
                        and oor.DESTINATION_ACTION in ('Delivery', 'Merge')
                        and o.CREATED_TIMESTAMP >= NOW() - INTERVAL ${days} DAY -- and o.CREATED_TIMESTAMP <= NOW() - INTERVAL 20 DAY
                        and oli.DELIVERY_METHOD_ID not in ('PickUpAtStore')
                        and oli.IS_RETURN != 1
                        and oli.IS_EVEN_EXCHANGE != 1
                        and il.LOCATION_SUB_TYPE_ID = 'DropShipVendor'
                        and (orl.CANCELLED_QUANTITY > 0)
                )
            ) * 100 as "% of First Pick Fulfillment 1 Day"
        FROM
            (
                SELECT
                    o.ORDER_ID,
                    oli.ORDER_LINE_ID,
                    oli.ITEM_ID,
                    SUM(orl.CANCELLED_QUANTITY),
                    COUNT(DISTINCT oor.RELEASE_ID) counts
                from
                    default_order.ORD_ORDER o
                    inner join default_order.ORD_ORDER_LINE oli on oli.ORDER_PK = o.PK
                    inner join default_order.ORD_RELEASE oor on oor.ORDER_PK = o.PK
                    inner join default_order.ORD_RELEASE_LINE orl on orl.RELEASE_PK = oor.PK
                    AND orl.ORDER_LINE_ID = oli.ORDER_LINE_ID
                    inner join default_inventory.INV_LOCATION il on il.LOCATION_ID = oor.SHIP_FROM_LOCATION_ID
                WHERE
                    1 = 1
                    and oor.DESTINATION_ACTION in ('Delivery', 'Merge')
                    and o.CREATED_TIMESTAMP >= NOW() - INTERVAL ${days} DAY -- and o.CREATED_TIMESTAMP <= NOW() - INTERVAL 20 DAY
                    and oli.DELIVERY_METHOD_ID not in ('PickUpAtStore')
                    and oli.IS_RETURN != 1
                    and oli.IS_EVEN_EXCHANGE != 1
                    and il.LOCATION_SUB_TYPE_ID = 'DropShipVendor'
                group by
                    o.ORDER_ID,
                    oli.ORDER_LINE_ID,
                    oli.ITEM_ID
                having
                    SUM(orl.CANCELLED_QUANTITY) = 0
            ) subtable
        WHERE
            1 = 1
        UNION
        SELECT
            'OwnedWM',
            COUNT(*) / (
                COUNT(*) + (
                    select
                        COUNT(DISTINCT oli.PK)
                    from
                        default_order.ORD_ORDER o
                        inner join default_order.ORD_ORDER_LINE oli on oli.ORDER_PK = o.PK
                        inner join default_order.ORD_RELEASE oor on oor.ORDER_PK = o.PK
                        inner join default_order.ORD_RELEASE_LINE orl on orl.RELEASE_PK = oor.PK
                        AND orl.ORDER_LINE_ID = oli.ORDER_LINE_ID
                        inner join default_inventory.INV_LOCATION il on il.LOCATION_ID = oor.SHIP_FROM_LOCATION_ID
                    WHERE
                        1 = 1
                        and oor.DESTINATION_ACTION in ('Delivery', 'Merge')
                        and o.CREATED_TIMESTAMP >= NOW() - INTERVAL ${days} DAY -- and o.CREATED_TIMESTAMP <= NOW() - INTERVAL 20 DAY
                        and oli.DELIVERY_METHOD_ID not in ('PickUpAtStore')
                        and oli.IS_RETURN != 1
                        and oli.IS_EVEN_EXCHANGE != 1
                        and il.LOCATION_SUB_TYPE_ID = 'OwnedWM'
                        and (orl.CANCELLED_QUANTITY > 0)
                )
            ) * 100 as "% of First Pick Fulfillment 1 Day"
        FROM
            (
                SELECT
                    o.ORDER_ID,
                    oli.ORDER_LINE_ID,
                    oli.ITEM_ID,
                    SUM(orl.CANCELLED_QUANTITY),
                    COUNT(DISTINCT oor.RELEASE_ID) counts
                from
                    default_order.ORD_ORDER o
                    inner join default_order.ORD_ORDER_LINE oli on oli.ORDER_PK = o.PK
                    inner join default_order.ORD_RELEASE oor on oor.ORDER_PK = o.PK
                    inner join default_order.ORD_RELEASE_LINE orl on orl.RELEASE_PK = oor.PK
                    AND orl.ORDER_LINE_ID = oli.ORDER_LINE_ID
                    inner join default_inventory.INV_LOCATION il on il.LOCATION_ID = oor.SHIP_FROM_LOCATION_ID
                WHERE
                    1 = 1
                    and oor.DESTINATION_ACTION in ('Delivery', 'Merge')
                    and o.CREATED_TIMESTAMP >= NOW() - INTERVAL ${days} DAY -- and o.CREATED_TIMESTAMP <= NOW() - INTERVAL 20 DAY
                    and oli.DELIVERY_METHOD_ID not in ('PickUpAtStore')
                    and oli.IS_RETURN != 1
                    and oli.IS_EVEN_EXCHANGE != 1
                    and il.LOCATION_SUB_TYPE_ID = 'OwnedWM'
                group by
                    o.ORDER_ID,
                    oli.ORDER_LINE_ID,
                    oli.ITEM_ID
                having
                    SUM(orl.CANCELLED_QUANTITY) = 0
            ) subtable
        WHERE
            1 = 1
        UNION
        SELECT
            'StoreRegular',
            COUNT(*) / (
                COUNT(*) + (
                    select
                        COUNT(DISTINCT oli.PK)
                    from
                        default_order.ORD_ORDER o
                        inner join default_order.ORD_ORDER_LINE oli on oli.ORDER_PK = o.PK
                        inner join default_order.ORD_RELEASE oor on oor.ORDER_PK = o.PK
                        inner join default_order.ORD_RELEASE_LINE orl on orl.RELEASE_PK = oor.PK
                        AND orl.ORDER_LINE_ID = oli.ORDER_LINE_ID
                        inner join default_inventory.INV_LOCATION il on il.LOCATION_ID = oor.SHIP_FROM_LOCATION_ID
                    WHERE
                        1 = 1
                        and oor.DESTINATION_ACTION in ('Delivery', 'Merge')
                        and o.CREATED_TIMESTAMP >= NOW() - INTERVAL ${days} DAY -- and o.CREATED_TIMESTAMP <= NOW() - INTERVAL 20 DAY
                        and oli.DELIVERY_METHOD_ID not in ('PickUpAtStore')
                        and oli.IS_RETURN != 1
                        and oli.IS_EVEN_EXCHANGE != 1
                        and il.LOCATION_SUB_TYPE_ID = 'StoreRegular'
                        and (orl.CANCELLED_QUANTITY > 0)
                )
            ) * 100 as "% of First Pick Fulfillment 1 Day"
        FROM
            (
                SELECT
                    o.ORDER_ID,
                    oli.ORDER_LINE_ID,
                    oli.ITEM_ID,
                    SUM(orl.CANCELLED_QUANTITY),
                    COUNT(DISTINCT oor.RELEASE_ID) counts
                from
                    default_order.ORD_ORDER o
                    inner join default_order.ORD_ORDER_LINE oli on oli.ORDER_PK = o.PK
                    inner join default_order.ORD_RELEASE oor on oor.ORDER_PK = o.PK
                    inner join default_order.ORD_RELEASE_LINE orl on orl.RELEASE_PK = oor.PK
                    AND orl.ORDER_LINE_ID = oli.ORDER_LINE_ID
                    inner join default_inventory.INV_LOCATION il on il.LOCATION_ID = oor.SHIP_FROM_LOCATION_ID
                WHERE
                    1 = 1
                    and oor.DESTINATION_ACTION in ('Delivery', 'Merge')
                    and o.CREATED_TIMESTAMP >= NOW() - INTERVAL ${days} DAY -- and o.CREATED_TIMESTAMP <= NOW() - INTERVAL 20 DAY
                    and oli.DELIVERY_METHOD_ID not in ('PickUpAtStore')
                    and oli.IS_RETURN != 1
                    and oli.IS_EVEN_EXCHANGE != 1
                    and il.LOCATION_SUB_TYPE_ID = 'StoreRegular'
                group by
                    o.ORDER_ID,
                    oli.ORDER_LINE_ID,
                    oli.ITEM_ID
                having
                    SUM(orl.CANCELLED_QUANTITY) = 0
            ) subtable
        WHERE
            1 = 1`
    )
    const odsr = response[0].find((line) => Object.values(line).includes("StoreRegular"))
    const odsrv = Object.values(odsr).filter((v) => typeof(v) === "number")

    return Math.floor(odsrv[0] * 100) / 100
}

async function uniqueStoreFillRate(days) {
    const response = await knex.raw(
        `SELECT
            LOCATION_SUB_TYPE_ID,
            AVG(SFR)
        FROM
            (
                SELECT
                    SUM(T1.FULFILLED_QUANTITY) /(
                        SUM(T1.FULFILLED_QUANTITY) + SUM(T1.CANCELLED_QUANTITY)
                    ) AS SFR,
                    LOCATION_SUB_TYPE_ID
                FROM
                    (
                        SELECT
                            ORDER_ID,
                            ORDER_LINE_ID,
                            ITEM_ID,
                            FULFILLED_QUANTITY,
                            CANCELLED_QUANTITY,
                            SHIP_FROM_LOCATION_ID AS SFLI,
                            IL.LOCATION_SUB_TYPE_ID
                        FROM
                            default_order.ORD_RELEASE_LINE RL
                            INNER JOIN default_order.ORD_RELEASE R ON RL.RELEASE_PK = R.PK
                            INNER JOIN default_inventory.INV_LOCATION IL ON IL.LOCATION_ID = R.SHIP_FROM_LOCATION_ID
                        WHERE
                            RL.CREATED_TIMESTAMP > NOW() - INTERVAL ${days} DAY
                        GROUP BY
                            ORDER_ID,
                            ORDER_LINE_ID,
                            ITEM_ID,
                            FULFILLED_QUANTITY,
                            CANCELLED_QUANTITY,
                            SHIP_FROM_LOCATION_ID,
                            IL.LOCATION_SUB_TYPE_ID
                    ) T1
                GROUP BY
                    T1.LOCATION_SUB_TYPE_ID
                HAVING
                    SUM(T1.FULFILLED_QUANTITY) /(
                        SUM(T1.FULFILLED_QUANTITY) + SUM(T1.CANCELLED_QUANTITY)
                    ) IS NOT NULL
            ) AS T2
        GROUP BY
            LOCATION_SUB_TYPE_ID`
    )
    const usfr = Object.values(response[0].find((line) => line.LOCATION_SUB_TYPE_ID === "StoreRegular")).find((value) => typeof value === 'number')
    return Math.floor(usfr * 10000) / 100
}
module.exports = { fillRate, storeFirstFillRates, uniqueStoreFillRate }