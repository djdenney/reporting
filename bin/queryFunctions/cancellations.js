const knex = require("../connection");

async function cancellations(days) {
    const response = await knex.raw(
        `select
        round(
            (
                CANCEL_ORDER.CANCEL_ORDER / TOTAL_ORDER.TOTAL_ORDER
            ) * 100,
            0
        ) as CANCEL_RATE,
        CANCEL_ORDER.PRICE as $_CANCEL_ORDER_LINE_TOTAL,
        TOTAL_ORDER.PRICE as $_ORDER_LINE_TOTAL
    from
        -- 1A  CANCEL ORDER LINES in the last 7 Days
        (
            select
                SUM(CANCELLED_ORDER_LINE_SUB_TOTAL) as PRICE,
                COUNT(ool.PK) as CANCEL_ORDER
            from
                default_order.ORD_ORDER_LINE ool
                inner join default_order.ORD_ORDER oo on ool.ORDER_PK = oo.PK
            where
                1 = 1
                AND oo.IS_CONFIRMED = 1
                AND ool.IS_CANCELLED = 1
                AND oo.MAX_RETURN_STATUS_ID is null
                AND ool.MAX_FULFILLMENT_STATUS_ID = '9000'
                AND ool.UPDATED_TIMESTAMP >= now() - INTERVAL ${days} DAY
        ) as CANCEL_ORDER,
        -- 1B TOTAL ORDER lINES CREATED in the past 7 Days
        (
            select
                SUM(ORDER_LINE_SUB_TOTAL) as PRICE,
                COUNT(ool.PK) as TOTAL_ORDER
            from
                default_order.ORD_ORDER_LINE ool
                inner join default_order.ORD_ORDER oo on ool.ORDER_PK = oo.PK
            where
                1 = 1
                AND oo.IS_CONFIRMED = 1
                AND oo.MAX_RETURN_STATUS_ID is null
                AND ool.CREATED_TIMESTAMP >= now() - INTERVAL ${days} DAY
        ) as TOTAL_ORDER`
    )
    // console.log(`${days} Day Cancel Rate: ${response[0][0].CANCEL_RATE}%`)
    return response[0][0].CANCEL_RATE
}

async function storeVendorDCCancel(days) {
    const response = await knex.raw(
        `SELECT
        (CANCEL_LINES.COUNT / TOTAL_CANCEL.COUNT) * 100 as oD
    FROM
        -- A Distinct Cancel Lines that have a Release Associated to Store/Vendor 
        (
            select
                count(distinct OOL.PK) as COUNT
            from
                default_order.ORD_ORDER_LINE OOL
                inner join default_order.ORD_ORDER OO on OO.PK = OOL.ORDER_PK
                inner join default_order.ORD_RELEASE ORD on OO.PK = ORD.ORDER_PK
                inner join default_organization.ORG_LOCATION OL on OL.LOCATION_ID = ORD.SHIP_FROM_LOCATION_ID
                inner join default_order.ORD_RELEASE_LINE ORL on ORL.RELEASE_PK = ORD.PK
                and ORL.ORDER_LINE_ID = OOL.ORDER_LINE_ID = ORL.ORDER_LINE_ID
            where
                OOL.UPDATED_TIMESTAMP >= NOW() - INTERVAL ${days} Day
                and OOL.MAX_FULFILLMENT_STATUS_ID = 9000
                and ORL.CANCELLED_QUANTITY > 0
                and OL.LOCATION_SUB_TYPE_ID in ('StoreRegular', 'DropShipVendor')
        ) as CANCEL_LINES,
        -- B All Cancel Lines in the Past 30 Days
        (
            select
                count(distinct OOL.PK) as COUNT
            from
                default_order.ORD_ORDER_LINE OOL
                inner join default_order.ORD_ORDER OO on OOL.ORDER_PK = OO.PK
            where
                OOL.UPDATED_TIMESTAMP >= NOW() - INTERVAL ${days} Day
                and OOL.MAX_FULFILLMENT_STATUS_ID = 9000
                and OO.IS_CONFIRMED = 1
        ) as TOTAL_CANCEL`
    )
    return response[0][0].oD
}
//storeVendorDCCancel(1)
module.exports = {cancellations, storeVendorDCCancel};