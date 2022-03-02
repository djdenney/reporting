const knex = require("../connection");

async function bopisProcessingTime(days) {
    const response = await knex.raw(
        `Select
            timestampdiff(
                second,
                status_open.Created_DTTM,
                status_released.Created_DTTM
            ) / 60 "PROCESS_TIME",
            CAST(status_open.ool_pk AS CHAR) "LINE"
        from
            (
                select
                    oo.pk as oo_pk,
                    ool.PK as ool_pk,
                    oo.ORDER_ID as "Order",
                    fsd.DESCRIPTION as "Status",
                    ool.DELIVERY_METHOD_ID as "Deliv Method",
                    ool.SHIP_TO_LOCATION_ID as "Ship To Loc #",
                    oqd.CREATED_BY as "Created By",
                    oo.CAPTURED_DATE as "Created_DTTM"
                from
                    default_order.ORD_ORDER oo
                    inner join default_order.ORD_ORDER_LINE ool on ool.ORDER_PK = oo.PK
                    inner join default_order.ORD_QUANTITY_DETAIL oqd on oqd.ORDER_LINE_PK = ool.PK
                    inner join default_order.FW_STATUS_DEFINITION fsd on fsd.STATUS = oqd.STATUS_ID
                    and fsd.PROFILE_ID = oqd.ORG_ID
                where
                    1 = 1
                    and oqd.CREATED_TIMESTAMP >= NOW() - INTERVAL ${days} Day
                    and fsd.DESCRIPTION = 'Open'
                    and ool.DELIVERY_METHOD_ID = 'PickUpAtStore'
                    /*----- BOPIS-----*/
                ORDER BY
                    oo.ORDER_ID,
                    oo.pk,
                    ool.PK
            ) status_open
            inner join (
                select
                    oo.pk as oo_pk,
                    ool.PK as ool_pk,
                    oo.ORDER_ID as "Order",
                    fsd.DESCRIPTION as "Status",
                    oqd.CREATED_TIMESTAMP as "Created_DTTM"
                from
                    default_order.ORD_ORDER oo
                    inner join default_order.ORD_ORDER_LINE ool on ool.ORDER_PK = oo.PK
                    inner join default_order.ORD_QUANTITY_DETAIL oqd on oqd.ORDER_LINE_PK = ool.PK
                    inner join default_order.FW_STATUS_DEFINITION fsd on fsd.STATUS = oqd.STATUS_ID
                    and fsd.PROFILE_ID = oqd.ORG_ID
                where
                    1 = 1
                    and oo.CREATED_TIMESTAMP >= NOW() - INTERVAL ${days} Day
                    and fsd.DESCRIPTION = 'Released'
                ORDER BY
                    oo.ORDER_ID,
                    oo.pk,
                    ool.PK
            ) status_released on status_open.ORDER = status_released.ORDER
            and status_open.oo_pk = status_released.oo_pk
            and status_open.ool_pk = status_released.ool_pk
        order by
            1 asc`
    )
    const n97 = response[0].slice(0, Math.floor(response[0].length * .97))
    const avg = n97.reduce((sum, line) => sum + line.PROCESS_TIME, 0) / n97.length
    const rnd = Math.round(avg * 100) / 100
    return rnd
}

exports.bopisProcessingTime = bopisProcessingTime;