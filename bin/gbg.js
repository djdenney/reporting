const knex = require("./connection");
const tableName = "ORD_ORDER";
const today = new Date(new Date(new Date().setDate(new Date().getDate())).toISOString().slice(0, 10));
const yesterday = new Date(new Date(new Date().setDate(new Date().getDate() - 2)).toISOString().slice(0, 10));
console.log(today);
console.log(yesterday);

async function testQuery() {
    const response = await knex(tableName)
        .withSchema("default_order")
        .select("*")
        .where("CREATED_TIMESTAMP", ">=", yesterday)
        .andWhere("CREATED_TIMESTAMP", "<", today);
    // const filtered = response.filter((order) => order.MAX_FULFILLMENT_STATUS_ID < "3000");
    console.log(response.length)
    return process.exit()
}

testQuery()
