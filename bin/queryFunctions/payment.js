const knex = require("../connection");

async function failRate(days) {
    const response = await knex.raw(
        `SELECT
            DISTINCT FALIURES.CARD_TYPE,
            FALIURES.TRAN_TYPE,
            FALIURES.TOTAL_TRANSACTION as FAILED_TRANSACTION,
            TOTALS.TOTAL_TRANSACTION,
            (
                (
                    FALIURES.TOTAL_TRANSACTION / TOTALS.TOTAL_TRANSACTION
                ) * 100
            ) as FAILURE_RATE
        FROM
            (
                select
                    pm.CARD_TYPE AS CARD_TYPE,
                    ppt.TRANSACTION_TYPE AS TRAN_TYPE,
                    count(ppt.PAYMENT_TRANSACTION_ID) AS TOTAL_TRANSACTION
                from
                    default_payment.PAY_PAYMENT_METHOD pm
                    inner join default_payment.PAY_PAYMENT_TRANSACTION ppt on ppt.PAYMENT_METHOD_PK = pm.PK
                    inner join default_order.ORD_ORDER oo on ppt.ORDER_ID = oo.ORDER_ID
                    inner join default_order.ORD_PAYMENT_STATUS ops on ops.STATUS_ID = oo.PAYMENT_STATUS_ID
                where
                    1 = 1
                    and ppt.CREATED_TIMESTAMP >= NOW() - INTERVAL ${days} Day
                    and ppt.TRANSACTION_TYPE in ('Authorization') -- and ppt.PAYMENT_RESPONSE_STATUS in ('Success')
                    and ppt.PAYMENT_RESPONSE_STATUS in ('Failure')
                    and pm.PAYMENT_TYPE not in ('PayPal', 'AR Credit', 'Gift Card')
                group by
                    ppt.TRANSACTION_TYPE,
                    pm.CARD_TYPE
                order by
                    3 desc
            ) AS FALIURES,
            (
                select
                    pm.CARD_TYPE AS CARD_TYPE,
                    ppt.TRANSACTION_TYPE AS TRAN_TYPE,
                    count(ppt.PAYMENT_TRANSACTION_ID) AS TOTAL_TRANSACTION
                from
                    default_payment.PAY_PAYMENT_METHOD pm
                    inner join default_payment.PAY_PAYMENT_TRANSACTION ppt on ppt.PAYMENT_METHOD_PK = pm.PK
                    inner join default_order.ORD_ORDER oo on ppt.ORDER_ID = oo.ORDER_ID
                    inner join default_order.ORD_PAYMENT_STATUS ops on ops.STATUS_ID = oo.PAYMENT_STATUS_ID
                where
                    1 = 1
                    and ppt.CREATED_TIMESTAMP >= NOW() - INTERVAL ${days} Day
                    and ppt.TRANSACTION_TYPE in ('Authorization')
                    and pm.CARD_TYPE in (
                        select
                            DISTINCT pm.CARD_TYPE AS CARD_TYPE
                        from
                            default_payment.PAY_PAYMENT_METHOD pm
                            inner join default_payment.PAY_PAYMENT_TRANSACTION ppt on ppt.PAYMENT_METHOD_PK = pm.PK
                            inner join default_order.ORD_ORDER oo on ppt.ORDER_ID = oo.ORDER_ID
                            inner join default_order.ORD_PAYMENT_STATUS ops on ops.STATUS_ID = oo.PAYMENT_STATUS_ID
                        where
                            1 = 1
                            and ppt.CREATED_TIMESTAMP >= NOW() - INTERVAL ${days} Day
                            and ppt.TRANSACTION_TYPE in ('Authorization')
                            and ppt.PAYMENT_RESPONSE_STATUS in ('Failure')
                            and pm.PAYMENT_TYPE not in ('PayPal', 'AR Credit', 'Gift Card')
                    )
                    and pm.PAYMENT_TYPE not in ('PayPal', 'AR Credit', 'Gift Card')
                group by
                    ppt.TRANSACTION_TYPE,
                    pm.CARD_TYPE
                order by
                    3 desc
            ) AS TOTALS
        WHERE
            FALIURES.CARD_TYPE = TOTALS.CARD_TYPE`
    )
    response[0].sort((a, b) => a.FAILURE_RATE - b.FAILURE_RATE)
    return {
        "CARD_TYPE": response[0][response[0].length - 1].CARD_TYPE,
        "FAILURE_RATE": response[0][response[0].length - 1].FAILURE_RATE
    }
}

module.exports = { failRate }