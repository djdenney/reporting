const knex = require("../connection");

async function cancellations(days) {
    const response = await knex.raw(
        // Report: Cancel_dashboard
        // Query: SQL9 (Modified to Accommodate "days" variable)
        `select
            round(
                (
                    CANCEL_ORDER.CANCEL_ORDER / TOTAL_ORDER.TOTAL_ORDER
                ) * 100,
                2
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
        // Report: Cancel_dashboard
        // Query: SQL4 (Modified to Accommodate "days" variable)
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
    return Math.floor(response[0][0].oD * 100) / 100
}
async function allCancelRates(days, rates = []) {
    const response = await knex.raw(
        // Report: Cancel_dashboard
        // Query: SQL9 (Modified to Accommodate "days" variable)
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
    rates.push(response[0][0].CANCEL_RATE)
    switch(days) {
        case 1:
            return allCancelRates(7, rates);
        case 7:
            return allCancelRates(30, rates);
        case 30:
            return allCancelRates(90, rates);
        case 90:
            return allCancelRates(365, rates);
        default:
            rates.sort((a, b) => a - b)
            return rates[rates.length - 1]
        
    }
}
async function cancelToStoreOrVendor() {
    const response = await knex.raw(
        // Report: Cancel_dashboard
        // Query: SQL1
        `SELECT
            (CANCEL_LINES.COUNT / TOTAL_CANCEL.COUNT) * 100 as 365D
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
                    OOL.UPDATED_TIMESTAMP >= NOW() - INTERVAL 365 Day
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
                    OOL.UPDATED_TIMESTAMP >= NOW() - INTERVAL 365 Day
                    and OOL.MAX_FULFILLMENT_STATUS_ID = 9000
                    and OO.IS_CONFIRMED = 1
            ) as TOTAL_CANCEL`
    )
    return Math.floor(Object.values(response[0][0])[0] * 100) / 100
}

async function bopisLineShorts() {
    const response = await knex.raw(
        // Report: Cancel_dashboard
        // Query: SQL11
        `select
            BOPIS_SHORTS.REASON as SHORT_REASON,
            BOPIS_SHORTS.TOTAL_PRICE as ITEM_PRICE_OF_CANCELLED_QUANTITY,
            BOPIS_SHORTS.FULFILLMENT_LINE_TOTAL as FULFILLMENT_LINE_TOTAL,
            round(
                (
                    BOPIS_SHORTS.FULFILLMENT_LINE_TOTAL / BOPIS_TOTAL.TOTAL_LINE
                ) * 100,
                2
            ) as PERCENT_OF_TOTAL
        from
            (
                select
                    ffls.SHORT_REASON_ID as REASON,
                    SUM(
                        ROUND((ffl.ITEM_UNIT_PRICE * ffl.CANCELLED_QTY), 2)
                    ) as TOTAL_PRICE,
                    count(ffl.PK) as FULFILLMENT_LINE_TOTAL
                from
                    default_fulfillment.FUL_FULFILLMENT_LINE_SHORTS ffls
                    inner join default_fulfillment.FUL_FULFILLMENT_LINE ffl on ffl.PK = ffls.FULFILLMENT_LINE_PK
                    inner join default_fulfillment.FUL_FULFILLMENT ff on ff.PK = ffl.FULFILLMENT_PK
                    inner join default_organization.ORG_LOCATION ol on ol.LOCATION_ID = ff.SHIP_FROM_LOCATION_ID
                where
                    1 = 1
                    and ffls.UPDATED_TIMESTAMP > now() - INTERVAL 7 DAY
                    and ff.ORDER_TYPE_ID != 'Marketplace'
                    and ffl.FULFILLMENT_LINE_STATUS_ID = '9000.000'
                    and ff.DELIVERY_METHOD_ID = 'PickUpAtStore'
                    and ol.LOCATION_SUB_TYPE_ID = 'StoreRegular'
                    and ff.CANCEL_REASON_ID is null
                GROUP BY
                    ffls.SHORT_REASON_ID
            ) as BOPIS_SHORTS,
            (
                select
                    -- SUM(ROUND((ffl.ITEM_UNIT_PRICE * ffl.ORDERED_QTY),2)) as PRICE, 
                    count(ffl.PK) as TOTAL_LINE
                from
                    default_fulfillment.FUL_FULFILLMENT_LINE ffl
                    inner join default_fulfillment.FUL_FULFILLMENT ff on ff.PK = ffl.FULFILLMENT_PK
                    inner join default_organization.ORG_LOCATION ol on ol.LOCATION_ID = ff.SHIP_FROM_LOCATION_ID
                where
                    1 = 1
                    and ffl.CREATED_TIMESTAMP > now() - INTERVAL 7 DAY
                    and ff.ORDER_TYPE_ID != 'Marketplace'
                    and ff.DELIVERY_METHOD_ID = 'PickUpAtStore'
                    and ol.LOCATION_SUB_TYPE_ID = 'StoreRegular'
            ) as BOPIS_TOTAL`
    )
    const totalLines = response[0].reduce((a, b) => a + b.FULFILLMENT_LINE_TOTAL, 0)
    return totalLines
}

async function bopisLineCancels() {
    const response = await knex.raw(
        // Report: Cancel_dashboard
        // Query: SQL12
        `select
            SUM(ROUND((ffl.ITEM_UNIT_PRICE * ffl.ORDERED_QTY), 2)) as TOTAL_PRICE,
            count(ffl.PK) as TOTAL_LINE
        from
            default_fulfillment.FUL_FULFILLMENT_LINE ffl
            inner join default_fulfillment.FUL_FULFILLMENT ff on ff.PK = ffl.FULFILLMENT_PK
            inner join default_organization.ORG_LOCATION ol on ol.LOCATION_ID = ff.SHIP_FROM_LOCATION_ID
        where
            1 = 1
            and ffl.CREATED_TIMESTAMP > now() - INTERVAL 7 DAY
            and ff.ORDER_TYPE_ID != 'Marketplace'
            and ff.DELIVERY_METHOD_ID = 'PickUpAtStore'
            and ol.LOCATION_SUB_TYPE_ID = 'StoreRegular'`
    )
    return response[0][0].TOTAL_LINE
}
bopisLineCancels()

module.exports = {
    cancellations, 
    storeVendorDCCancel, 
    allCancelRates, 
    cancelToStoreOrVendor,
    bopisLineShorts,
    bopisLineCancels,
};