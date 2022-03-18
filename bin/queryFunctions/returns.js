const knex = require("../connection")

async function returnRate(days) {
    const response = await knex.raw(
        // Report: Returns
        // Query: SQL5 (Modified to Accommodate "days" variable)
        `SELECT
            RETURN_ORDERS.COUNT / CREATED_ORDERS.COUNT * 100 AS 'RETURN_RATE'
        FROM
            (
                SELECT
                    COUNT(DISTINCT ORDER_ID) AS COUNT
                FROM
                    default_order.ORD_ORDER
                WHERE
                    CREATED_TIMESTAMP >= NOW() - INTERVAL ${days} DAY
                    AND MAX_FULFILLMENT_STATUS_ID = 7000
                    AND MAX_RETURN_STATUS_ID IS NULL
                ORDER BY
                    CREATED_TIMESTAMP ASC
            ) AS CREATED_ORDERS,
            (
                SELECT
                    COUNT(DISTINCT ORDER_ID) AS COUNT
                FROM
                    default_order.ORD_ORDER
                WHERE
                    CREATED_TIMESTAMP >= NOW() - INTERVAL ${days} DAY
                    AND MAX_FULFILLMENT_STATUS_ID = 8500
                    AND MAX_RETURN_STATUS_ID IS NULL
                ORDER BY
                    CREATED_TIMESTAMP ASC
            ) AS RETURN_ORDERS`
    )
    return Math.floor(response[0][0].RETURN_RATE * 100) / 100
}

async function blindReturns(days, isMP) {
    const response = await knex.raw(
        // Report: Returns
        // Query: SQL1 (Modified to Accommodate "days" variable)
        `select
            oo.ORG_ID as "Org",
            sum(
                case
                    when oo.CREATED_BY != 'mifintg@lesl.com' then 1
                    else 0
                end
            ) AS "Expected Return",
            sum(
                case
                    when oo.CREATED_BY = 'mifintg@lesl.com' then 1
                    else 0
                end
            ) AS "Blind Return",
            sum(
                case
                    when oo.RETURN_LINE_COUNT > 0 then 1
                    else 0
                end
            ) as "Total Returns",
            (
                sum(
                    case
                        when oo.CREATED_BY = 'mifintg@lesl.com' then 1
                        else 0
                    end
                ) / sum(
                    case
                        when oo.RETURN_LINE_COUNT > 0 then 1
                        else 0
                    end
                )
            ) * 100 as "% Blind",
            (
                sum(
                    case
                        when oo.CREATED_BY != 'mifintg@lesl.com' then 1
                        else 0
                    end
                ) / sum(
                    case
                        when oo.RETURN_LINE_COUNT > 0 then 1
                        else 0
                    end
                )
            ) * 100 as "% Expected"
        from
            default_order.ORD_ORDER oo
        where
            1 = 1
            and ORDER_ID NOT LIKE '%SLE%'
            and ORDER_ID NOT LIKE '%SLP%'
            and ORDER_ID NOT LIKE '%SIT%'
            and ORDER_ID NOT LIKE '%SPS%'
            and ORDER_ID NOT LIKE '%SHT'
            and ORDER_ID NOT LIKE '%SPR%'
            and oo.RETURN_LINE_COUNT > 0
            and oo.CREATED_TIMESTAMP >= NOW() - INTERVAL ${days} DAY
        group by
            oo.ORG_ID
        ORDER BY
            oo.ORG_ID desc`
    )
    if (isMP) {
        const filter = response[0].filter((line) => line.Org === "MP")
        const BR = filter.reduce((a, b) => a + Object.values(b)[2], 0) / filter.reduce((a, b) => a + Object.values(b)[3], 0)
        return Math.floor(BR * 10000) / 100
    } else {
        const filter = response[0].filter((line) => line.Org !== "MP")
        const BR = filter.reduce((a, b) => a + Object.values(b)[2], 0) / filter.reduce((a, b) => a + Object.values(b)[3], 0)
        return Math.floor(BR * 10000) / 100
    }
}

blindReturns(1, false)

module.exports = {returnRate, blindReturns}