const knex = require("./connection");
const ExcelJS = require("exceljs");
const workbook = new ExcelJS.Workbook();
const { bopisProcessingTime } = require("./queryFunctions/bopisProcessingTime");
const { cancellations, storeVendorDCCancel } = require("./queryFunctions/cancellations");

// async function testQuery() {
//     const response = await knex(tableName)
//         .withSchema("default_order")
//         .select("*")
//         .where("CREATED_TIMESTAMP", ">=", yesterday)
//         .andWhere("CREATED_TIMESTAMP", "<", today)
//         .andWhere({
//             IS_CONFIRMED: 1,
//         })
//         .andWhere({
//             IS_CANCELLED: 0,
//         })
//         .andWhere("ORDER_TOTAL", ">", "0");
//     // const filtered = response.filter((order) => order.MAX_FULFILLMENT_STATUS_ID >= "7000");
//     console.log(response[0]);
//     return process.exit();
// }

async function buildReport() {
    try {
        const bpt1 = await bopisProcessingTime(1)
        console.log(`1 Day Average N97 Order Processing Time: ${bpt1} minutes`)
        const bpt7 = await bopisProcessingTime(7)
        console.log(`7 Day Average N97 Order Processing Time: ${bpt7} minutes`)
        console.log("-----")
        const can1 = await cancellations(1)
        console.log(`1 Day Cancel Rate: ${can1}%`)
        const can7 = await cancellations(7)
        console.log(`7 Day Cancel Rate: ${can7}%`)
        const svdc1 = await storeVendorDCCancel(1)
        console.log(`1 Day Store, Vendor and DC Cancels: ${svdc1}%`)
    } catch (e) {
        console.error(e)
    }
    process.exit()   
}

buildReport()