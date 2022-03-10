const knex = require("./connection");
const ExcelJS = require("exceljs");
const workbook = new ExcelJS.Workbook();
const { bopisProcessingTime } = require("./queryFunctions/bopisProcessingTime");
const { cancellations, storeVendorDCCancel, allCancelRates, cancelToStoreOrVendor } = require("./queryFunctions/cancellations");
const { currentOpenCriticalTickets, criticalTicketsCreated } = require("./requestFunctions/criticalTickets")
const { backorderedSuccessful, stuckInAllocated, timeToRelease } = require("./queryFunctions/allocatedReleased")
const { failRate } = require("./queryFunctions/payment");
const { fillRate, storeFirstFillRates, uniqueStoreFillRate } = require("./queryFunctions/fulfillment");
const { returnRate, blindReturns } = require("./queryFunctions/returns")
const { openRates, backorderRates } = require("./queryFunctions/orderAging")

async function buildReport() {
    let oneDayTotal = 0
    let twoDayTotal = 0
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
        const sufrod = await uniqueStoreFillRate(1)
        console.log(`1 Day Store Unique Fill Rate: ${sufrod}%`)
        const sufrow = await uniqueStoreFillRate(7)
        console.log(`7 Day Store Unique Fill Rate: ${sufrow}%`)
        const sfod = await storeFirstFillRates(1)
        console.log(`1 Day Store First Fill Rate: ${sfod}%`)
        const sfow = await storeFirstFillRates(7)
        console.log(`7 Day Store First Fill Rate: ${sfow}%`)
        const odfr = await failRate(1)
        console.log(`1 Day Max Payment Failure Rate: ${odfr.CARD_TYPE}, ${odfr.FAILURE_RATE}%`)
        const owfr = await failRate(7)
        console.log(`7 Day Max Payment Failure Rate: ${owfr.CARD_TYPE}, ${owfr.FAILURE_RATE}%`)
        const tdfr = await failRate(30)
        console.log(`30 Day Max Payment Failure Rate: ${tdfr.CARD_TYPE}, ${tdfr.FAILURE_RATE}%`)
        const rrsixty = await returnRate(60)
        console.log(`60 Day Return Rate: ${rrsixty}`)
        const rryear = await returnRate(365)
        console.log(`365 Day Return Rate: ${rryear}`)
        const odbxmp = await blindReturns(1, false)
        console.log(`1 Day Blind Return Rate (Excluding Marketplace): ${odbxmp}%`)
        const owbxmp = await blindReturns(7, false)
        console.log(`1 Day Blind Return Rate (Excluding Marketplace): ${owbxmp}%`)
        const odbmp = await blindReturns(1, true)
        console.log(`1 Day Blind Return Rate for Marketplace: ${odbmp}`)
        const acr = await allCancelRates(1)
        console.log(`Highest Cancel Rate of 1, 7, 30, 90, 365 Day Intervals: ${acr}%`)
        const ctsov = await cancelToStoreOrVendor()
        console.log(`Cancel Rate to Store or Vendor: ${ctsov}%`)
        const oprat = await openRates()
        oprat.forEach((line, i) => {
            switch(Object.keys(line)[0]) {
                case "3PL":
                    console.log(`Orders Open 2-3 Days Rate for 3PL: ${Object.values(line)[0]}%`);
                    break;
                case "DropShipVendor":
                    console.log(`Orders Open 2-3 Days Rate for Vendor: ${Object.values(line)[0]}%`);
                    break;
                case "OwnedWM":
                    console.log(`Orders Open 2-3 Days Rate for DC: ${Object.values(line)[0]}%`);
                    break;
                case "StoreRegular":
                    console.log(`Orders Open 2-3 Days Rate for Stores: ${Object.values(line)[0]}%`);
                    break;
                case "SevenDayOpen":
                    console.log(`Orders Open 7 Days Rate: ${Object.values(line)[0]}%`);
                    break;
                case "ThirtyDatOpenDC3PLStore":
                    console.log(`Orders Open 30 Days Rate for DC, 3PL, and Store: ${Object.values(line)[0]}%`);
                    break;
                case "OpenThirtyDays":
                    console.log(`Orders Open 30 Days: ${Object.values(line)[0]}`);
                    break;
                case "VendorThirtyDayRate":
                    console.log(`Orders Open 30 Days Rate for Vendor: ${Object.values(line)[0]}%`);
                    break;
                case "VendorSevenDayRate":
                    console.log(`Orders Open 7 Days Rate for Vendor: ${Object.values(line)[0]}%`);
                    break;
                case "OneDayTotal":
                    oneDayTotal = Object.values(line)[0]
                    break;
                case "TwoDayTotal":
                    twoDayTotal = Object.values(line)[0]
                    break;
            }
        })
        const borat = await backorderRates(oneDayTotal, twoDayTotal)
        console.log()
        console.log("-----")
    } catch (e) {
        console.error(e)
    }
    process.exit()   
}

buildReport()