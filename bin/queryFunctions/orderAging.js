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
    const resultArray = response[0].map((line) => {
        const target = Object.values(line)[3]
        const total = Object.values(line).reduce((a, b) => isNaN(b) ? a : a + b, 0)
        const type = Object.values(line)[0]
        let result = {}
        result[type] = Math.floor(target / total * 10000) / 100
        return result 
    })
    const sevenDayOpen = Math.floor(response[0].reduce((a, b) => a + Object.values(b)[6] + Object.values(b)[7], 0) / response[0].reduce((a, b) => a + Object.values(b).reduce((c, d) => isNaN(d) ? c : c + d, 0), 0) * 10000) / 100
    let sevenDayResult = {}
    sevenDayResult["SevenDayOpen"] = sevenDayOpen
    resultArray.push(sevenDayResult)
    const thirtyDayOpenDC3PLStore = Math.floor(response[0].reduce((a, b) => Object.values(b).includes("DropShipVendor") ? a : a + Object.values(b)[8], 0) / response[0].reduce((a, b) => a + Object.values(b)[8], 0) * 10000) / 100
    let thirtyDayOpenDC3PLStoreResult = {}
    thirtyDayOpenDC3PLStoreResult["ThirtyDayOpenDC3PLStore"] = thirtyDayOpenDC3PLStore
    resultArray.push(thirtyDayOpenDC3PLStoreResult)
    const openThirtyDays = response[0].reduce((a, b) => a + Object.values(b)[8], 0)
    let openThirtyDaysResult = {}
    openThirtyDaysResult["OpenThirtyDays"] = openThirtyDays
    resultArray.push(openThirtyDaysResult)
    const vendorThirtyDayRate = Math.floor(response[0].reduce((a, b) => Object.values(b).includes("DropShipVendor") ? a + Object.values(b)[8] : a, 0) / response[0].reduce((a, b) => Object.values(b).includes("DropShipVendor") ? a + Object.values(b).reduce((c, d) => d !== "DropShipVendor" ? c + d : c, 0) : a, 0) * 10000) / 100
    let vendorThirtyDayRateResult = {}
    vendorThirtyDayRateResult["VendorThirtyDayRate"] = vendorThirtyDayRate
    resultArray.push(vendorThirtyDayRateResult)
    const vendorSevenDayRate = Math.floor(response[0].reduce((a, b) => Object.values(b).includes("DropShipVendor") ? a + Object.values(b)[5] : a, 0) / response[0].reduce((a, b) => Object.values(b).includes("DropShipVendor") ? a + Object.values(b).reduce((c, d) => d !== "DropShipVendor" ? c + d : c, 0) : a, 0) * 10000) / 100
    let vendorSevenDayRateResult = {}
    vendorSevenDayRateResult["VendorSevenDayRate"] = vendorSevenDayRate
    resultArray.push(vendorSevenDayRateResult)
    const oneDayTotal = response[0].reduce((a, b) => a + Object.values(b)[1], 0)
    let oneDayTotalResult = {}
    oneDayTotalResult["OneDayTotal"] = oneDayTotal
    resultArray.push(oneDayTotalResult)
    const twoDayTotal = response[0].reduce((a, b) => a + Object.values(b)[1] + Object.values(b)[2], 0)
    let twoDayTotalResult = {}
    twoDayTotalResult["TwoDayTotal"] = twoDayTotal
    resultArray.push(twoDayTotalResult)
    const totalOrders = response[0].reduce((a, b) => a + Object.values(b).reduce((c, d) => isNaN(d) ? c : c + d, 0), 0)
    let totalOrdersResult = {}
    totalOrdersResult["TotalOrders"] = totalOrders
    resultArray.push(totalOrdersResult)
    return resultArray
}

async function backorderRates(oneDayTotal, twoDayTotal, totalOrders) {
    const response = await knex.raw(
        `SELECT
            subtable.DESCRIPTION AS "Order Status",
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
                    fsd.DESCRIPTION,
                    oo.CREATED_TIMESTAMP
                from
                    default_order.ORD_ORDER oo
                    inner join default_order.ORD_ORDER_LINE ool on ool.ORDER_PK = oo.PK
                    inner join default_order.FW_STATUS_DEFINITION fsd on (fsd.STATUS = ool.MIN_FULFILLMENT_STATUS_ID)
                    and (fsd.PROFILE_ID = oo.ORG_ID)
                where
                    1 = 1
                    and oo.CREATED_TIMESTAMP >= NOW() - INTERVAL 200 DAY
                    and fsd.STATUS < 7000
                    and oo.IS_CONFIRMED = 1
                    and fsd.DESCRIPTION in ('Back Ordered', 'Allocated')
                group by
                    oo.ORDER_ID,
                    fsd.DESCRIPTION,
                    oo.CREATED_TIMESTAMP
                order by
                    oo.CREATED_TIMESTAMP asc
            ) as subtable
        WHERE
            1 = 1
        GROUP BY
            subtable.DESCRIPTION`
    )
    const resultArray = []
    const backorderOneDay = Math.floor(response[0].reduce((a, b) => Object.values(b).includes("Back Ordered") ? a + Object.values(b)[1] : a, 0) / oneDayTotal * 10000) / 100
    let backorderOneDayResult = {}
    backorderOneDayResult["BackorderOneDay"] = backorderOneDay
    resultArray.push(backorderOneDayResult)
    const backorderThirtyDay = Math.floor(response[0].reduce((a, b) => Object.values(b).includes("Back Ordered") ? a + Object.values(b)[8] : a, 0) / oneDayTotal * 10000) / 100
    let backorderThirtyDayResult = {}
    backorderThirtyDayResult["BackorderThirtyDay"] = backorderThirtyDay
    resultArray.push(backorderThirtyDayResult)
    const allocatedTwoDay = Math.floor(response[0].reduce((a, b) => Object.values(b).includes("Allocated") ? a + Object.values(b)[1] + Object.values(b)[2] : a, 0) / twoDayTotal * 10000) / 100
    let allocatedTwoDayResult = {}
    allocatedTwoDayResult["AllocatedTwoDay"] = allocatedTwoDay
    resultArray.push(allocatedTwoDayResult)
    const allocatedThirtyDayRate = Math.floor(response[0].reduce((a, b) => Object.values(b).includes("Allocated") ? a + Object.values(b).reduce((c, d) => isNaN(d) ? c : c + d, 0) : a, 0) / totalOrders * 10000) / 100
    let allocatedThirtyDayRateResult = {}
    allocatedThirtyDayRateResult["AllocatedThirtyDayRate"] = allocatedThirtyDayRate
    resultArray.push(allocatedThirtyDayRateResult)
    const allocatedThirtyDayTotal = response[0].reduce((a, b) => Object.values(b).includes("Allocated") ? a + Object.values(b)[8] : a, 0)
    let allocatedThirtyDayTotalResult = {}
    allocatedThirtyDayTotalResult["AllocatedThirtyDayTotal"] = allocatedThirtyDayTotal
    resultArray.push(allocatedThirtyDayRateResult)
    const allocatedTenDayTotal = response[0].reduce((a, b) => Object.values(b).includes("Allocated") ? a + Object.values(b)[7] : a, 0)
    let allocatedTenDayTotalResult = {}
    allocatedTenDayTotalResult["AllocatedTenDayTotal"] = allocatedTenDayTotal
    resultArray.push(allocatedTenDayTotal)
    return resultArray
}   

async function returnToShelf() {
    const response = await knex.raw(
        `SELECT
            FF.SHIP_TO_LOCATION_ID,
            date_format(FF.CREATED_TIMESTAMP, '%Y-%m-%d') AS 'CREATED_TIMESTAMP',
            FFL.ORDER_ID,
            FF.FULFILLMENT_ID,
            FF.CUSTOMER_FIRST_NAME,
            FF.CUSTOMER_LAST_NAME,
            date_format(FF.PICKUP_EXPIRY_DATE, '%Y-%m-%d') AS 'PICKUP_EXPIRTY_DATE',
            FFL.ITEM_ID,
            FFL.ORDERED_QTY,
            FFL.ITEM_UNIT_PRICE,
            -- FFL.FULFILLMENT_LINE_STATUS_ID,
            SD.DESCRIPTION,
            TIMESTAMPDIFF(DAY, MIN(FF.CREATED_TIMESTAMP), CURDATE()) AS 'AGE_IN_DAYS'
        FROM
            default_fulfillment.FUL_FULFILLMENT FF
            INNER JOIN default_fulfillment.FUL_FULFILLMENT_LINE FFL ON FFL.FULFILLMENT_PK = FF.PK
            INNER JOIN default_fulfillment.FW_STATUS_DEFINITION SD ON (
                SD.STATUS = FFL.FULFILLMENT_LINE_STATUS_ID
                AND SD.PROFILE_ID = 'LPS'
            )
        WHERE
            FF.PICKUP_EXPIRY_DATE <= NOW() - INTERVAL 3 DAY
            AND FFL.FULFILLMENT_LINE_STATUS_ID = '3000.000'
        GROUP BY
            FF.SHIP_TO_LOCATION_ID,
            FF.CREATED_TIMESTAMP,
            FFL.ORDER_ID,
            FF.FULFILLMENT_ID,
            FF.CUSTOMER_FIRST_NAME,
            FF.CUSTOMER_LAST_NAME,
            FF.PICKUP_EXPIRY_DATE,
            FFL.ITEM_ID,
            FFL.ORDERED_QTY,
            FFL.ITEM_UNIT_PRICE,
            SD.DESCRIPTION,
            FF.CREATED_TIMESTAMP
        ORDER BY
            'AGE_IN_DAYS' DESC`
    )
    return response[0].length
}

async function stalePickStatus() {
    const response = await knex.raw(
        `select
            oo.ORDER_ID,
            oor.RELEASE_ID,
            ool.ITEM_ID,
            -- IL.LOCATION_SUB_TYPE_ID,
            oor.SHIP_FROM_LOCATION_ID,
            oor.DELIVERY_METHOD_ID,
            date_format(oo.CREATED_TIMESTAMP, '%Y-%m-%d') as 'CREATED_TIMESTAMP',
            -- ool.MIN_FULFILLMENT_STATUS_ID,
            SD.DESCRIPTION,
            CASE
                WHEN (
                    oo.CREATED_TIMESTAMP > current_timestamp() - INTERVAL 1 DAY
                ) THEN 'Open 0-1 day'
                WHEN (
                    oo.CREATED_TIMESTAMP < current_timestamp() - INTERVAL 1 DAY
                    AND oo.CREATED_TIMESTAMP > current_timestamp() - INTERVAL 2 DAY
                ) THEN 'Open 1-2 day'
                WHEN (
                    oo.CREATED_TIMESTAMP < current_timestamp() - INTERVAL 2 DAY
                    AND oo.CREATED_TIMESTAMP > current_timestamp() - INTERVAL 3 DAY
                ) THEN 'Open 2-3 day'
                WHEN (
                    oo.CREATED_TIMESTAMP < current_timestamp() - INTERVAL 3 DAY
                    AND oo.CREATED_TIMESTAMP > current_timestamp() - INTERVAL 5 DAY
                ) THEN 'Open 3-5 day'
                WHEN (
                    oo.CREATED_TIMESTAMP < current_timestamp() - INTERVAL 5 DAY
                    AND oo.CREATED_TIMESTAMP > current_timestamp() - INTERVAL 7 DAY
                ) THEN 'Open 5-7 day'
                WHEN (
                    oo.CREATED_TIMESTAMP < current_timestamp() - INTERVAL 7 DAY
                    AND oo.CREATED_TIMESTAMP > current_timestamp() - INTERVAL 10 DAY
                ) THEN 'Open 7-10 day'
                WHEN (
                    oo.CREATED_TIMESTAMP < current_timestamp() - INTERVAL 10 DAY
                    AND oo.CREATED_TIMESTAMP > current_timestamp() - INTERVAL 30 DAY
                ) THEN 'Open 10-30 day'
                WHEN (
                    oo.CREATED_TIMESTAMP <= current_timestamp() - INTERVAL 30 DAY
                ) THEN 'Open 30+ day'
            END AS AGE
        from
            default_order.ORD_ORDER oo
            inner join default_order.ORD_ORDER_LINE ool on ool.ORDER_PK = oo.PK
            inner join default_order.ORD_RELEASE oor on oor.ORDER_PK = oo.PK
            inner join default_order.ORD_RELEASE_LINE orl on orl.ORDER_LINE_ID = ool.ORDER_LINE_ID
            and orl.RELEASE_PK = oor.PK
            INNER JOIN default_inventory.INV_LOCATION IL ON IL.LOCATION_ID = oor.SHIP_FROM_LOCATION_ID
            INNER JOIN default_order.FW_STATUS_DEFINITION SD on (
                SD.STATUS = ool.MIN_FULFILLMENT_STATUS_ID
                and SD.PROFILE_ID = oo.ORG_ID
            )
        where
            1 = 1
            and ool.DELIVERY_METHOD_ID = 'ShipToAddress'
            and IL.LOCATION_SUB_TYPE_ID = 'StoreRegular'
            and ool.MIN_FULFILLMENT_STATUS_ID = '3600'
            and (orl.FULFILLED_QUANTITY + orl.CANCELLED_QUANTITY) < orl.QUANTITY`
    )
    return response[0].length
}

stalePickStatus()
    
module.exports = { openRates, backorderRates, returnToShelf, stalePickStatus }