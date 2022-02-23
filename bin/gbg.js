const knex = require("./connection");
const tableName = "ORD_ORDER";
const today = new Date(new Date(new Date(new Date().setDate(new Date().getDate())).toISOString().slice(0, 10)) - 25200000);
const yesterday = new Date(new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0, 10));
console.log(today);
console.log(yesterday);
console.log(new Date().toISOString().slice(0, 19).replace(/[T\-:]/g, ""))

async function testQuery() {
    const response = await knex(tableName)
        .withSchema("default_order")
        .select("*")
        .where("CREATED_TIMESTAMP", ">=", yesterday)
        .andWhere("CREATED_TIMESTAMP", "<", today)
        .andWhere({
            IS_CONFIRMED: 1,
        })
        .andWhere({
            IS_CANCELLED: 0,
        })
        .andWhere("ORDER_TOTAL", ">", "0");
    // const filtered = response.filter((order) => order.MAX_FULFILLMENT_STATUS_ID >= "7000");
    console.log(response[0]);
    return process.exit();
}

async function bopisProcessingTime(day, int = 1, released = []) {
    // const priorDay = new Date(day - 86400000);
    // const processingTimes = []
    // const response = await knex("ORD_ORDER")
    //     .withSchema("default_order")
    //     .select("ORD_ORDER.PK", "FW_STATUS_DEFINITION.DESCRIPTION", "ORD_ORDER_LINE.DELIVERY_METHOD_ID", "ORD_ORDER.CAPTURED_DATE", "ORD_QUANTITY_DETAIL.CREATED_TIMESTAMP")
    //     .innerJoin("ORD_ORDER_LINE", "ORD_ORDER.PK", "ORD_ORDER_LINE.ORDER_PK")
    //     .withSchema("default_order")
    //     .innerJoin("ORD_QUANTITY_DETAIL", "ORD_QUANTITY_DETAIL.ORDER_LINE_PK", "ORD_ORDER_LINE.PK")
    //     .withSchema("default_order")
    //     .innerJoin("FW_STATUS_DEFINITION", function() {
    //         this.on("FW_STATUS_DEFINITION.STATUS", "ORD_QUANTITY_DETAIL.STATUS_ID")
    //         this.andOn("FW_STATUS_DEFINITION.PROFILE_ID", "ORD_QUANTITY_DETAIL.ORG_ID")
    //     })
    //     .withSchema("default_order")
    //     .where("ORD_QUANTITY_DETAIL.CREATED_TIMESTAMP", ">=", priorDay)
    //     .andWhere("ORD_QUANTITY_DETAIL.CREATED_TIMESTAMP", "<", day)
    //     .andWhere("ORD_ORDER_LINE.DELIVERY_METHOD_ID", "=", "PickUpAtStore")
    //     //.andWhere("FW_STATUS_DEFINITION.DESCRIPTION", "=", "Released");
    
    // const bopis = response.filter((line) => line.DELIVERY_METHOD_ID === "PickUpAtStore")
	// const open = bopis.filter((line) => line.DESCRIPTION === "Open")
	// released = released.concat(bopis.filter((line) => line.DESCRIPTION === "Released"))
    // released.forEach((line, i) => {
    //     released[i].PROCESSING_TIME = (line.CREATED_TIMESTAMP - line.CAPTURED_DATE)
    //     processingTimes.push(released[i].PROCESSING_TIME)
    // })
    // const averageProcessingTime = (((processingTimes.reduce((a, b) => a + b) / processingTimes.length) / 1000) / 60)
    // if (int === 1) {
    //     const oneDayN97ProcessingTimes = processingTimes.slice(0, Math.floor(processingTimes.length * .97))
    //     const oneDayN97APT = oneDayN97ProcessingTimes.reduce((a, b) => a + b) / oneDayN97ProcessingTimes.length / 1000 / 60
    //     console.log("Average of top 97% for 1 day: " + oneDayN97APT)
    // }
    // console.log(averageProcessingTime)
    // if (int === 7) {
    //     processingTimes.sort((a, b) => a - b)
    //     const n97ProcessingTimes = processingTimes.slice(0, Math.floor(processingTimes.length * .97))
    //     const n97APT = n97ProcessingTimes.reduce((a, b) => a + b) / n97ProcessingTimes.length / 1000 / 60
    //     console.log("Average of top 97% for 7 Days: " + n97APT)
    //     console.log("done")
    //     process.exit()
    // }
    // bopisProcessingTime(priorDay, int + 1, released)
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
                    and oqd.CREATED_TIMESTAMP >= NOW() - INTERVAL 1 Day
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
                    and oo.CREATED_TIMESTAMP >= NOW() - INTERVAL 1 Day
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
    console.log(response)
}

bopisProcessingTime(today);
