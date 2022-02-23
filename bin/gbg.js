const knex = require("./connection");
const tableName = "ORD_ORDER";
const today = new Date(new Date(new Date().setDate(new Date().getDate())).toISOString().slice(0, 10));
const yesterday = new Date(new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0, 10));
console.log(today);
console.log(yesterday);

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

async function bopisProcessingTime() {
	let filtered = []
    const response = await knex("ORD_ORDER")
        .withSchema("default_order")
        .select("*")
        .innerJoin("ORD_ORDER_LINE", "ORD_ORDER.PK", "ORD_ORDER_LINE.ORDER_PK")
        .withSchema("default_order")
        .innerJoin("ORD_QUANTITY_DETAIL", "ORD_QUANTITY_DETAIL.ORDER_LINE_PK", "ORD_ORDER_LINE.PK")
        .withSchema("default_order")
        .innerJoin("FW_STATUS_DEFINITION", "FW_STATUS_DEFINITION.STATUS", "ORD_QUANTITY_DETAIL.STATUS_ID")
        .withSchema("default_order")
        .where("ORD_QUANTITY_DETAIL.CREATED_TIMESTAMP", ">=", yesterday)
        .andWhere("ORD_QUANTITY_DETAIL.CREATED_TIMESTAMP", "<", today)
        .andWhere("ORD_ORDER_LINE.DELIVERY_METHOD_ID", "=", "PickUpAtStore")
        //.andWhere("FW_STATUS_DEFINITION.DESCRIPTION", "=", "Released");

	filtered = response.filter((line) => {
		filtered.forEach((fline) => {
			if (!Object.values(fline).includes(line.PK)) {
				console.log("ahhh")
				filtered.push({PK: line.PK, DESCRIPTION: line.DESCRIPTION})
			}
		})
	})
	const open = filtered.filter((line) => line.DESCRIPTION === "Open")
	const released = filtered.filter((line) => line.DESCRIPTION === "Released")

	console.log(open.length)
	console.log(released.length)
    process.exit();
}

bopisProcessingTime();
