const knex = require("./connection");
const ExcelJS = require("exceljs");
const workbook = new ExcelJS.Workbook();
const { bopisProcessingTime } = require("./queryFunctions/bopisProcessingTime");
const { cancellations, storeVendorDCCancel } = require("./queryFunctions/cancellations");
const { currentOpenCriticalTickets, criticalTicketsCreated } = require("./requestFunctions/criticalTickets")
const { backorderedSuccessful, stuckInAllocated, timeToRelease } = require("./queryFunctions/allocatedReleased")
const { failRate } = require("./queryFunctions/payment");
const { fillRate, storeFirstFillRates } = require("./queryFunctions/fulfillment");

async function buildReport() {
    try {
        console.log("-----")
        const bpt1 = await bopisProcessingTime(1)
        console.log(`1 Day Average N97 Order Processing Time: ${bpt1} minutes`)
        const bpt7 = await bopisProcessingTime(7)
        console.log(`7 Day Average N97 Order Processing Time: ${bpt7} minutes`)
        const can1 = await cancellations(1)
        console.log(`1 Day Cancel Rate: ${can1}%`)
        const can7 = await cancellations(7)
        console.log(`7 Day Cancel Rate: ${can7}%`)
        const svdc1 = await storeVendorDCCancel(1)
        console.log(`1 Day Store, Vendor and DC Cancels: ${svdc1}%`)
        const coct = await currentOpenCriticalTickets()
        console.log(`Current Unresolved Critical Issues: ${coct}`)
        const ctc = await criticalTicketsCreated()
        console.log(`1 Day Critical Tickets Created: ${ctc}`)
        //add orderImport functions
        const bs = await backorderedSuccessful()
        console.log(`Current Backorder Rate: ${bs.BACKORDERED}%`)
        console.log(`Current Success Rate: ${bs.SUCCESSFUL}%`)
        const sia = await stuckInAllocated()
        console.log(`Orders Stuck in Allocated, Not On Hold: ${sia}`)
        const ttr = await timeToRelease() 
        console.log(`Average N97 Time to Release for ITS: ${ttr.ITS} minutes`)
        console.log(`Average N97 Time to Release for LEA: ${ttr.LEA} minutes`)
        console.log(`Average N97 Time to Release for LPS: ${ttr.LPS} minutes`)
        console.log(`Average N97 Time to Release for MP: ${ttr.MP} minutes`)
        console.log(`Average N97 Time to Release for PRO: ${ttr.PRO} minutes`)
        console.log(`Average N97 Time to Release for PSW: ${ttr.PSW} minutes`)
        const odfill = await fillRate(1)
        odfill.forEach((line) => console.log(`1 Day Fill Rate for ${line.FULFILLMENT_TYPE}: ${line.FILL_RATE}%`))
        const owfill = await fillRate(7)
        owfill.forEach((line) => console.log(`7 Day Fill Rate for ${line.FULFILLMENT_TYPE}: ${line.FILL_RATE}%`))
        const sfod = await storeFirstFillRates(1)
        //add more fulfillment functions
        const odfr = await failRate(1)
        console.log(`1 Day Max Payment Failure Rate: ${odfr.CARD_TYPE}, ${odfr.FAILURE_RATE}%`)
        const owfr = await failRate(7)
        console.log(`7 Day Max Payment Failure Rate: ${owfr.CARD_TYPE}, ${owfr.FAILURE_RATE}%`)
        const tdfr = await failRate(30)
        console.log(`30 Day Max Payment Failure Rate: ${tdfr.CARD_TYPE}, ${tdfr.FAILURE_RATE}%`)
        console.log("-----")
    } catch (e) {
        console.error(e)
    }
    process.exit()   
}

buildReport()