const knex = require("../connection");

async function storeBounceRate() {
    const response = await knex.raw(
        `SELECT
            AVG(SB.CR)
        FROM
            (
                SELECT
                    SUM(
                        CASE
                            WHEN RL.CANCELLED_QUANTITY > 0 THEN 1
                            ELSE 0
                        END
                    ) AS CR
                FROM
                    default_order.ORD_RELEASE R
                    INNER JOIN default_order.ORD_RELEASE_LINE RL ON R.PK = RL.RELEASE_PK
                    INNER JOIN default_inventory.INV_LOCATION IL ON IL.LOCATION_ID = R.SHIP_FROM_LOCATION_ID
                    INNER JOIN default_order.ORD_ORDER OO ON OO.ORDER_ID = R.ORDER_ID
                WHERE
                    OO.UPDATED_TIMESTAMP > NOW() - INTERVAL 1 DAY
                    AND IL.LOCATION_SUB_TYPE_ID = 'StoreRegular'
                    AND OO.MAX_FULFILLMENT_STATUS_ID >= 4500
                GROUP BY
                    R.ORDER_ID
            ) SB`
    )
    return Object.values(response[0][0])[0]
}

async function tenBounce() {
    const response = await knex.raw(
        `SELECT
            COUNT(DISTINCT(OO10.OID))
        FROM
            (
                SELECT
                    OO.ORDER_ID AS OID,
                    OOL.ORDER_LINE_ID,
                    OOL.ITEM_ID,
                    OOL.IS_ON_HOLD,
                    OOL.MAX_FULFILLMENT_STATUS_ID,
                    OOL.MIN_FULFILLMENT_STATUS_ID,
                    OO.CREATED_TIMESTAMP
                FROM
                    default_order.ORD_ORDER OO
                    INNER JOIN default_order.ORD_RELEASE RL ON OO.ORDER_ID = RL.ORDER_ID
                    INNER JOIN default_order.ORD_ORDER_LINE OOL ON OOL.ORDER_PK = OO.PK
                    INNER JOIN default_inventory.INV_LOCATION IL ON IL.LOCATION_ID = RL.SHIP_FROM_LOCATION_ID
                    INNER JOIN default_order.ORD_RELEASE_LINE RLL ON RLL.RELEASE_PK = RL.PK
                    AND RLL.ORDER_LINE_ID = OOL.ORDER_LINE_ID
                WHERE
                    IL.LOCATION_SUB_TYPE_ID = 'StoreRegular'
                    AND OOL.MIN_FULFILLMENT_STATUS_ID NOT IN (
                        '1500',
                        '3600',
                        '9000',
                        '7000',
                        '7500',
                        '8000',
                        '8500',
                        '18000'
                    )
                    AND RLL.CANCELLED_QUANTITY > 0
                GROUP BY
                    OO.ORDER_ID,
                    OOL.ORDER_LINE_ID,
                    OOL.ITEM_ID,
                    OOL.IS_ON_HOLD,
                    OOL.MAX_FULFILLMENT_STATUS_ID,
                    OOL.MIN_FULFILLMENT_STATUS_ID,
                    OO.CREATED_TIMESTAMP
                HAVING
                    COUNT(DISTINCT(RL.RELEASE_ID)) > 10
            ) AS OO10`
    )
    return Object.values(response[0][0])[0]
}

async function uniqueTenBounce() {
    const response = await knex.raw(
        `SELECT
            COUNT(DISTINCT(OO10.OID))
        FROM
            (
                SELECT
                    OO.ORDER_ID AS OID,
                    OO.CREATED_TIMESTAMP
                FROM
                    default_order.ORD_ORDER OO
                    INNER JOIN default_order.ORD_RELEASE RL ON OO.ORDER_ID = RL.ORDER_ID
                    INNER JOIN default_order.ORD_ORDER_LINE OOL ON OOL.ORDER_PK = OO.PK
                    INNER JOIN default_inventory.INV_LOCATION IL ON IL.LOCATION_ID = RL.SHIP_FROM_LOCATION_ID
                    INNER JOIN default_order.ORD_RELEASE_LINE RLL ON RLL.RELEASE_PK = RL.PK
                    AND RLL.ORDER_LINE_ID = OOL.ORDER_LINE_ID
                WHERE
                    IL.LOCATION_SUB_TYPE_ID = 'StoreRegular'
                    AND OOL.MIN_FULFILLMENT_STATUS_ID NOT IN (
                        '1500',
                        '3600',
                        '9000',
                        '7000',
                        '7500',
                        '8000',
                        '8500',
                        '18000'
                    )
                    AND RLL.CANCELLED_QUANTITY > 0
                GROUP BY
                    OO.ORDER_ID,
                    OO.CREATED_TIMESTAMP,
                    OOL.ORDER_LINE_ID
                HAVING
                    COUNT(DISTINCT(RL.SHIP_FROM_LOCATION_ID)) > 10
            ) AS OO10`
    )
    return Object.values(response[0][0])[0]
}

async function uniqueVendorFillRate(days) {
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
    const uvfr = Object.values(response[0].find((line) => line.LOCATION_SUB_TYPE_ID === "DropShipVendor")).find((value) => typeof value === 'number')
    return Math.floor(uvfr * 10000) / 100
}

async function vendorBounceRate() {
    const response = await knex.raw(
        `SELECT
            AVG(SB.CR)
        FROM
            (
                SELECT
                    COUNT(DISTINCT(RL.RELEASE_PK)) AS CR
                FROM
                    default_order.ORD_RELEASE R
                    INNER JOIN default_order.ORD_RELEASE_LINE RL ON R.PK = RL.RELEASE_PK
                    INNER JOIN default_inventory.INV_LOCATION IL ON IL.LOCATION_ID = R.SHIP_FROM_LOCATION_ID
                    INNER JOIN default_order.ORD_ORDER OO ON OO.ORDER_ID = R.ORDER_ID
                WHERE
                    OO.UPDATED_TIMESTAMP > NOW() - INTERVAL 1 DAY
                    AND IL.LOCATION_SUB_TYPE_ID = 'DropShipVendor'
                    AND OO.MAX_FULFILLMENT_STATUS_ID >= 4500
                GROUP BY
                    R.ORDER_ID,
                    RL.ORDER_LINE_ID
            ) SB`
    )
    return Object.values(response[0][0])[0]
}

async function vendorTenBounce() {
    const response = await knex.raw(
        `SELECT
            COUNT(DISTINCT(OO10.OID))
        FROM
            (
                SELECT
                    OO.ORDER_ID AS OID
                FROM
                    default_order.ORD_ORDER OO
                    INNER JOIN default_order.ORD_RELEASE RL ON OO.ORDER_ID = RL.ORDER_ID
                    INNER JOIN default_order.ORD_ORDER_LINE OOL ON OOL.ORDER_PK = OO.PK
                    INNER JOIN default_inventory.INV_LOCATION IL ON IL.LOCATION_ID = RL.SHIP_FROM_LOCATION_ID
                    INNER JOIN default_order.ORD_RELEASE_LINE RLL ON RLL.RELEASE_PK = RL.PK
                WHERE
                    IL.LOCATION_SUB_TYPE_ID = 'DropShipVendor'
                    AND OO.MAX_FULFILLMENT_STATUS_ID < 6000
                    AND RLL.CANCELLED_QUANTITY > 0
                GROUP BY
                    OO.ORDER_ID
                HAVING
                    COUNT(DISTINCT(RL.RELEASE_ID)) > 5
            ) AS OO10`
    )
    return Object.values(response[0][0])[0]
}
storeBounceRate()
module.exports = { storeBounceRate, tenBounce, uniqueTenBounce, uniqueVendorFillRate, vendorBounceRate, vendorTenBounce }