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

async function successRate(ytd, fromDate, toDate) {
    ytd ? fromDate = new Date(new Date("2021-10-03")).toISOString().slice(0, 10) : fromDate = new Date(new Date().setDate(new Date().getDate() - 35)).toISOString().slice(0, 10)
    toDate = new Date(new Date().setDate(new Date().getDate() - 5)).toISOString().slice(0, 10)
    const response = await knex.raw(
        `select
            SUM(SuccessRate.Success) / SUM(SuccessRate.UnitsAttempted) AS '${ytd ? 'YTD' : '30 DAY'} SUCCESS RATE'
        FROM
            (
                select
                    distinct OO.ORG_ID,
                    OO.ORDER_ID,
                    OL.ITEM_ID,
                    OL.ORDER_LINE_ID,
                    RETURN_LINE_COUNT,
                    coalesce(OL.QUANTITY, 0) AS OrderLineRemain,
                    coalesce(OLA.CANCEL_QUANTITY, 0) AS OrderLineCancel,
                    coalesce(OL.QUANTITY, 0) + coalesce(OLA.CANCEL_QUANTITY, 0) AS OriginalOrderLine,
                    SUM(coalesce(ORL.QUANTITY, 0)) AS ReleaseQty,
                    CASE
                        when SUM(coalesce(ORL.QUANTITY, 0)) >= (
                            coalesce(OL.QUANTITY, 0) + coalesce(OLA.CANCEL_QUANTITY, 0)
                        ) THEN (
                            coalesce(OL.QUANTITY, 0) + coalesce(OLA.CANCEL_QUANTITY, 0)
                        )
                        when SUM(coalesce(ORL.QUANTITY, 0)) < (
                            coalesce(OL.QUANTITY, 0) + coalesce(OLA.CANCEL_QUANTITY, 0)
                        ) THEN SUM(coalesce(ORL.QUANTITY, 0))
                    END AS UnitsAttempted,
                    SUM(ORL.FULFILLED_QUANTITY) AS Success
                from
                    default_order.ORD_ORDER OO
                    join default_order.ORD_ORDER_LINE OL on OO.ORDER_ID = OL.ORDER_ID
                    left join default_order.ORD_ORDER_LINE_CANCEL_HISTORY OLA on OL.PK = OLA.ORDER_LINE_PK
                    join default_order.ORD_RELEASE ORE on OO.ORDER_ID = ORE.ORDER_ID
                    join default_order.ORD_RELEASE_LINE ORL on ORE.PK = ORL.RELEASE_PK
                    and ORL.ORDER_LINE_ID = OL.ORDER_LINE_ID
                    join default_organization.ORG_LOCATION OLL on ORE.SHIP_FROM_LOCATION_ID = OLL.LOCATION_ID -- where OL.quantity = 0 and OO.order_id <> '00000001'  and item_id <> '12103'
                    -- GROUP BY OO.ORG_ID, OO.ORDER_ID, OL.ITEM_ID, OL.ORDER_LINE_ID, OL.PK, OO.pk, OL.QUANTITY, OL.LINE_TYPE_ID
                    -- Need to only use releases that went to stores
                where
                    (
                        RETURN_LINE_COUNT < 1
                        or RETURN_LINE_COUNT is null
                    )
                    and OLL.LOCATION_SUB_TYPE_ID = 'StoreRegular'
                    and ORE.DESTINATION_ACTION in ('DELIVERY', 'MERGE')
                    and DATE(OO.CREATED_TIMESTAMP) >= '${fromDate}'
                    and DATE(OO.CREATED_TIMESTAMP) <= '${toDate}'
                GROUP BY
                    OO.ORG_ID,
                    OO.ORDER_ID,
                    OL.ITEM_ID,
                    OL.ORDER_LINE_ID,
                    RETURN_LINE_COUNT,
                    OL.LINE_TYPE_ID,
                    OL.QUANTITY,
                    OL.QUANTITY,
                    OLA.CANCEL_QUANTITY -- 11k release lines to stores in last 30 days
                    -- 7222 rows with a destination action of delivery/merge
            ) SuccessRate`
    )
    return Math.floor(Object.values(response[0][0])[0] * 10000) / 100
}

module.exports = { fillRate, storeFirstFillRates, uniqueStoreFillRate, successRate }