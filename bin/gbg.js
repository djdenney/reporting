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
		.andWhere({ IS_CONFIRMED: 1 })
		.andWhere({ IS_CANCELLED: 0 })
		.andWhere("ORDER_TOTAL", ">", "0");
	// const filtered = response.filter((order) => order.MAX_FULFILLMENT_STATUS_ID >= "7000");
	console.log(response.length);
	return process.exit();
}

testQuery();
