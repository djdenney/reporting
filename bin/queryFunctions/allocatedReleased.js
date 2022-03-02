const knex = require("../connection");

async function backorderedSuccessful() {
    const response = await knex.raw(
        `SELECT
            INCOMING_ORDERS.OPENED_ORDERS,
            BACKORDERED_ORDERS.BACKORDERED,
            ALLOCATED_ORDERS.ALLOCATED,
            RELEASED_ORDERS.RELEASED,
            STUCK_ALLOCATED_ORDERS.STUCK_IN_ALLOCATED,
            (
                (
                    RELEASED_ORDERS.RELEASED / ALLOCATED_ORDERS.ALLOCATED
                ) * 100
            ) AS 'SUCCESS_RATE'
        FROM
            (
                SELECT
                    COUNT(ORDER_ID) AS OPENED_ORDERS
                FROM
                    default_order.ORD_ORDER
                WHERE
                    CREATED_TIMESTAMP > Now() - interval 24 hour
                    AND IS_CONFIRMED = 1
                    AND IS_CANCELLED = 0
                    AND ORDER_TOTAL > 0
            ) AS INCOMING_ORDERS,
            (
                SELECT
                    COUNT(ORDER_ID) AS BACKORDERED
                FROM
                    default_order.ORD_ORDER
                WHERE
                    CREATED_TIMESTAMP > Now() - interval 24 hour
                    AND IS_CONFIRMED = 1
                    AND IS_CANCELLED = 0
                    AND ORDER_TOTAL > 0
                    AND MAX_FULFILLMENT_STATUS_ID = '1500'
            ) AS BACKORDERED_ORDERS,
            (
                SELECT
                    COUNT(ORDER_ID) AS ALLOCATED
                FROM
                    default_order.ORD_ORDER
                WHERE
                    CREATED_TIMESTAMP > Now() - interval 24 hour
                    AND IS_CONFIRMED = 1
                    AND IS_CANCELLED = 0
                    AND ORDER_TOTAL > 0
                    AND MAX_FULFILLMENT_STATUS_ID >= '2000'
            ) AS ALLOCATED_ORDERS,
            (
                SELECT
                    COUNT(ORDER_ID) AS RELEASED
                FROM
                    default_order.ORD_ORDER
                WHERE
                    CREATED_TIMESTAMP > Now() - interval 24 hour
                    AND IS_CONFIRMED = 1
                    AND IS_CANCELLED = 0
                    AND ORDER_TOTAL > 0
                    AND MAX_FULFILLMENT_STATUS_ID >= '3000'
            ) AS RELEASED_ORDERS,
            (
                SELECT
                    COUNT(ORDER_ID) AS STUCK_IN_ALLOCATED
                FROM
                    default_order.ORD_ORDER
                WHERE
                    CREATED_TIMESTAMP > Now() - interval 24 hour
                    AND IS_CONFIRMED = 1
                    AND IS_CANCELLED = 0
                    AND ORDER_TOTAL > 0
                    AND MAX_FULFILLMENT_STATUS_ID = '2000'
            ) AS STUCK_ALLOCATED_ORDERS`
    )
    
    return {
        "BACKORDERED": Math.floor(response[0][0].BACKORDERED / response[0][0].OPENED_ORDERS * 10000) / 100,
        "SUCCESSFUL": response[0][0].SUCCESS_RATE
    }
}

async function stuckInAllocated() {
    const response = await knex.raw(
        `select
            ORG_ID,
            ORDER_ID,
            OO.CREATED_TIMESTAMP,
            TIMEDIFF(Now(), OO.CREATED_TIMESTAMP) AS AGING_TIME,
            SHORT_DESCRIPTION
        from
            default_order.ORD_ORDER OO
            join default_order.ORD_PAYMENT_STATUS on PAYMENT_STATUS_ID = STATUS_ID
        where
            IS_ON_HOLD = false
            and OO.CREATED_TIMESTAMP > Now() - interval 24 hour
            and MAX_FULFILLMENT_STATUS_ID = 2000
            AND IS_CONFIRMED = 1
            AND IS_CANCELLED = 0
            AND ORDER_TOTAL > 0
            AND DO_NOT_RELEASE_BEFORE < Now()
            AND (
                (
                    ORG_ID = 'MP'
                    AND TIMEDIFF(Now(), OO.CREATED_TIMESTAMP) > '00:30:00'
                )
                OR (
                    ORG_ID IN ('HTW', 'ITS', 'LEA', 'LPS', 'PSW', 'PRO')
                    AND TIMEDIFF(Now(), OO.CREATED_TIMESTAMP) > '01:30:00'
                )
            )`
    )
    const filtered = response[0].filter((line) => !line.ORDER_ID.startsWith("CIT") || line.AGING_TIME.slice(0, 2) > 0)
    return filtered.length
}

async function timeToRelease(ITS = [], LEA = [], LPS = [], MP = [], PRO = [], PSW = []) {
    const response = await knex.raw(
        `SELECT
            ALLOCATED_TIMESTAMP_ORG_ID,
            time_to_sec(
                TIMEDIFF(
                    RELEASED_TIMESTAMP.RELEASED_TIME,
                    ALLOCATED_TIMESTAMP.ALLOCATED_TIME
                )
            ) AS 'TIME'
        FROM
            (
                SELECT
                    OO.ORG_ID AS ALLOCATED_TIMESTAMP_ORG_ID,
                    ORDER_ID AS ALLOCATED_ORDER_ID,
                    OOM.CREATED_TIMESTAMP AS ALLOCATED_TIME
                FROM
                    default_order.ORD_ORDER OO
                    INNER JOIN default_order.ORD_ORDER_MILESTONE OOM ON OOM.ORDER_PK = OO.PK
                WHERE
                    OOM.MILESTONE_DEFINITION_ID = 'Order::Milestone::Allocated'
                    AND OO.CREATED_TIMESTAMP > NOW() - INTERVAL 24 HOUR
            ) AS ALLOCATED_TIMESTAMP
            INNER JOIN (
                SELECT
                    ORDER_ID AS RELEASED_ORDER_ID,
                    OOM.UPDATED_TIMESTAMP AS RELEASED_TIME
                FROM
                    default_order.ORD_ORDER OO
                    INNER JOIN default_order.ORD_ORDER_MILESTONE OOM ON OOM.ORDER_PK = OO.PK
                WHERE
                    OOM.MILESTONE_DEFINITION_ID = 'Order::Milestone::Released'
                    AND OO.CREATED_TIMESTAMP > NOW() - INTERVAL 24 HOUR
            ) AS RELEASED_TIMESTAMP ON ALLOCATED_TIMESTAMP.ALLOCATED_ORDER_ID = RELEASED_TIMESTAMP.RELEASED_ORDER_ID`
    )

    response[0].forEach((line) => {
        switch (line.ALLOCATED_TIMESTAMP_ORG_ID) {
            case 'ITS':
                ITS.push(line);
            case 'LEA':
                LEA.push(line);
            case 'LPS':
                LPS.push(line);
            case 'MP':
                MP.push(line);
            case 'PRO':
                PRO.push(line);
            case 'PSW':
                PSW.push(line);
        }
    })

    ITS.sort((a, b) => a.TIME - b.TIME)
    LEA.sort((a, b) => a.TIME - b.TIME)
    LPS.sort((a, b) => a.TIME - b.TIME)
    MP.sort((a, b) => a.TIME - b.TIME)
    PRO.sort((a, b) => a.TIME - b.TIME)
    PSW.sort((a, b) => a.TIME - b.TIME)

    ITS = ITS.slice(0, Math.floor(ITS.length * .97))
    LEA = LEA.slice(0, Math.floor(LEA.length * .97))
    LPS = LPS.slice(0, Math.floor(LPS.length * .97))
    MP = MP.slice(0, Math.floor(MP.length * .97))
    PRO = PRO.slice(0, Math.floor(PRO.length * .97))
    PSW = PSW.slice(0, Math.floor(PSW.length * .97))

    const result = {
        "ITS": Math.round(ITS.reduce((a, b) => a + b.TIME, 0) / ITS.length / 60 * 100) / 100,
        "LEA": Math.round(LEA.reduce((a, b) => a + b.TIME, 0) / LEA.length / 60 * 100) / 100,
        "LPS": Math.round(LPS.reduce((a, b) => a + b.TIME, 0) / LPS.length / 60 * 100) / 100,
        "MP": Math.round(MP.reduce((a, b) => a + b.TIME, 0) / MP.length / 60 * 100) / 100,
        "PRO": Math.round(PRO.reduce((a, b) => a + b.TIME, 0) / PRO.length / 60 * 100) / 100,
        "PSW": Math.round(PSW.reduce((a, b) => a + b.TIME, 0) / PSW.length / 60 * 100) / 100
    }

    return result
}

module.exports = {backorderedSuccessful, stuckInAllocated, timeToRelease}
