const knex = require('../connection')

async function released(days) {
    const response = await knex.raw(
        `select
            Promising.Org,
            Promising.Met_RELEASE_SLA "Release SLA Compliance ${days} DAY",
            count(Promising.Met_RELEASE_SLA) "Total"
        from
            (
                select
                    oo.ORG_ID as "Org",
                    case
                        when oor.CREATED_TIMESTAMP is null
                        and ool.EXT_PROMISE_RELEASE_S_L_A > sysdate() then "Awaiting Release - TBD"
                        when oor.CREATED_TIMESTAMP is null
                        and ool.EXT_PROMISE_RELEASE_S_L_A < sysdate() then "Awaiting Release - Failed SLA"
                        when TIMESTAMPDIFF(
                            HOUR,
                            ool.EXT_PROMISE_RELEASE_S_L_A,
                            oor.CREATED_TIMESTAMP
                        ) <= 1 then "Yes"
                        else "No"
                    end as "Met_RELEASE_SLA"
                from
                    default_order.ORD_ORDER oo
                    inner join default_order.ORD_ORDER_LINE ool on ool.ORDER_PK = oo.PK
                    inner join default_order.FW_STATUS_DEFINITION fsd on (
                        fsd.STATUS = ool.MIN_FULFILLMENT_STATUS_ID
                        and fsd.PROFILE_ID = oo.ORG_ID
                    )
                    left outer join default_order.ORD_RELEASE oor on oor.ORDER_PK = oo.PK
                    left outer join default_order.ORD_RELEASE_LINE orl on orl.ORDER_LINE_ID = ool.ORDER_LINE_ID
                    and orl.RELEASE_PK = oor.PK
                    left outer join default_inventory.INV_LOCATION il on il.LOCATION_ID = oor.SHIP_FROM_LOCATION_ID
                WHERE
                    1 = 1
                    and oo.created_timestamp <= NOW() - INTERVAL 1.5 HOUR
                    and oo.created_timestamp >= NOW() - INTERVAL ${days} DAY
                    and ool.IS_RETURN = 0
                    and oo.ORG_ID not in ('MP')
                    and fsd.DESCRIPTION not in ('Canceled')
                    and oo.SELLING_CHANNEL_ID != 'CallCenter'
                    and (
                        orl.RELEASE_LINE_ID > 0
                        or oor.CREATED_TIMESTAMP is null
                    )
                    and EXT_PROMISE_RELEASE_S_L_A is not null
            ) as Promising
        group by
            Promising.Org,
            Promising.Met_RELEASE_SLA
        order by
            1,
            3 desc;`
    )
    console.log(response[0])
    
}

async function shipped(days) {
    const response = await knex.raw(
        `select
            SHIP_DATE.Org,
            SHIP_DATE.Met_Shipped_Date_SLA "Ship SLA Compliance ${days} DAY",
            COUNT(SHIP_DATE.Met_Shipped_Date_SLA) "Total"
        from
            (
                Select
                    oo.ORG_ID as "Org",
                    case
                        when TIMESTAMPDIFF(
                            HOUR,
                            ool.PROMISED_SHIP_DATE,
                            ofd.FULFILLMENT_DATE
                        ) <= 1 then "Yes"
                        else "No"
                    end as "Met_Shipped_Date_SLA"
                from
                    default_order.ORD_ORDER oo
                    inner join default_order.ORD_ORDER_LINE ool on ool.ORDER_PK = oo.PK
                    left outer join default_order.ORD_RELEASE oor on oor.ORDER_PK = oo.PK
                    left outer join default_order.ORD_RELEASE_LINE orl on orl.ORDER_LINE_ID = ool.ORDER_LINE_ID
                    and orl.RELEASE_PK = oor.PK
                    left outer join default_inventory.INV_LOCATION il on il.LOCATION_ID = oor.SHIP_FROM_LOCATION_ID
                    left outer join default_order.FW_STATUS_DEFINITION fsd on (
                        fsd.STATUS = ool.MIN_FULFILLMENT_STATUS_ID
                        and fsd.PROFILE_ID = oo.ORG_ID
                    )
                    left outer join default_order.ORD_FULFILLMENT_DETAIL ofd on ofd.ORDER_LINE_PK = ool.PK
                    and oor.RELEASE_ID = ofd.RELEASE_ID
                    and orl.RELEASE_LINE_ID = ofd.RELEASE_LINE_ID
                WHERE
                    1 = 1
                    and oo.created_timestamp <= NOW() - INTERVAL 1.5 HOUR
                    and oo.created_timestamp >= NOW() - INTERVAL ${days} DAY
                    AND orl.FULFILLED_QUANTITY > 0
                    and oo.ORG_ID not in ('MP')
                    and ool.PROMISED_SHIP_DATE is not null
                    and ool.MAX_FULFILLMENT_STATUS_ID != 9000
                    and ool.IS_RETURN = 0
                    and ofd.STATUS_ID in ('7000', '7500')
                    and oo.SELLING_CHANNEL_ID != 'CallCenter'
            ) SHIP_DATE
        group by
            SHIP_DATE.Org,
            SHIP_DATE.Met_Shipped_Date_SLA;`
    )
    // console.log(`shipped ${days}: `)
    // console.log(response[0])
    const result = response[0].map((line) => {
        let obj = {}
        Object.keys(line).forEach((k, i) => {
            obj[k] = Object.values(line)[i]
        })
        return obj
    })
    console.log(result)
}

async function delivered(days) {
    const response = await knex.raw(
        `select
            DELIVERY_DATE.ORG,
            DELIVERY_DATE.Met_DELIVERY_SLA "DELIVERY SLA COMPLIANCE ${days} DAY",
            COUNT(DELIVERY_DATE.Met_DELIVERY_SLA) "Total"
        from
            (
                select
                    OOL.ORG_ID as "ORG",
                    OFD.STATUS_ID,
                    case
                        when TIMESTAMPDIFF(
                            HOUR,
                            OOL.PROMISED_DELIVERY_DATE,
                            OOTI.DELIVERED_DATE
                        ) <= 1 then "Yes"
                        else "No"
                    end as "Met_DELIVERY_SLA"
                from
                    default_order.ORD_FULFILLMENT_DETAIL OFD
                    inner join default_order.ORD_ORDER_LINE OOL on OOL.PK = OFD.ORDER_LINE_PK
                    inner join default_order.ORD_ORDER OO on OO.PK = OOL.ORDER_PK
                    inner join default_order.ORD_RELEASE ORD on ORD.RELEASE_ID = OFD.RELEASE_ID
                    and ORD.ORDER_PK = OOL.ORDER_PK
                    inner join default_order.ORD_RELEASE_LINE ORL on ORL.RELEASE_PK = ORD.PK
                    and ORL.RELEASE_LINE_ID = OFD.RELEASE_LINE_ID
                    inner join default_order.ORD_ORDER_TRACKING_INFO OOTI on OOTI.TRACKING_NUMBER = OFD.TRACKING_NUMBER
                    and OOTI.ORDER_PK = OOL.ORDER_PK
                where
                    1 = 1
                    and OOL.created_timestamp <= NOW() - INTERVAL 1.5 HOUR
                    and OOL.created_timestamp >= NOW() - INTERVAL ${days} DAY
                    and OOL.ORG_ID != 'MP'
                    and OOL.IS_RETURN = 0
                    and OO.SELLING_CHANNEL_ID != 'CallCenter'
                    and OOL.PROMISED_DELIVERY_DATE is not null
                    and OFD.STATUS_ID = '7500'
            ) DELIVERY_DATE
        group by
            DELIVERY_DATE.ORG,
            DELIVERY_DATE.Met_DELIVERY_SLA;`
    )
    // console.log(`delivered ${days}: `)
    // console.log(response[0])
    const result = response[0].map((line) => {
        let obj = {}
        Object.keys(line).forEach((k, i) => {
            obj[k] = Object.values(line)[i]
        })
        return obj
    })
    console.log(result)
}
released(3)
module.exports = { released, shipped, delivered }