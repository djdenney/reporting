const ExcelJS = require("exceljs");
const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet("Sheet1");
const { bopisProcessingTime } = require("./queryFunctions/bopisProcessingTime");
const { cancellations, storeVendorDCCancel, allCancelRates, cancelToStoreOrVendor, bopisLineShorts, bopisLineCancels } = require("./queryFunctions/cancellations");
const { currentOpenCriticalTickets, criticalTicketsCreated } = require("./requestFunctions/criticalTickets");
const { backorderedSuccessful, stuckInAllocated, timeToRelease } = require("./queryFunctions/allocatedReleased");
const { failRate } = require("./queryFunctions/payment");
const { fillRate, storeFirstFillRates, uniqueStoreFillRate, successRate } = require("./queryFunctions/fulfillment");
const { returnRate, blindReturns } = require("./queryFunctions/returns");
const { openRates, backorderRates, returnToShelf, stalePickStatus } = require("./queryFunctions/orderAging");
const { storeBounceRate, tenBounce, uniqueTenBounce, uniqueVendorFillRate, vendorBounceRate, vendorTenBounce } = require("./queryFunctions/bounceReport");
const { promiseSuccessRate } = require("./queryFunctions/promiseDates");
const oper = {
	"<": function (a, b) {
		return a < b;
	},
	">": function (a, b) {
		return a > b;
	},
	"<=": function (a, b) {
		return a <= b;
	},
	">=": function (a, b) {
		return a >= b;
	},
	"===": function (a, b) {
		return a === b;
	},
};

async function buildReport() {
	let oneDayTotal = 0;
	let twoDayTotal = 0;
	let totalOrders = 0;
	let letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
	try {
		let rows = [];
		rows.push(["Information Source", "Category", "Metric", "SLA", "Target", "Actual", "Results", "Comment"]);
		//
		console.log("-----");
		const bpt1 = await bopisProcessingTime(1);
		console.log(`1 Day Average N97 Order Processing Time: ${bpt1} minutes`);
		rows.push(await createRow("BOPIS Orders", "Processing", "N[97] time to take BOPIS to get to store - 1d", 15, 10, bpt1, "<=", "m"));
		//
		const bpt7 = await bopisProcessingTime(7);
		console.log(`7 Day Average N97 Order Processing Time: ${bpt7} minutes`);
		rows.push(await createRow("BOPIS Orders Store", "Processing", "N[97] time to take BOPIS to get to store - 7d", 15, 10, bpt7, "<=", "m"));
		//
		const can1 = await cancellations(1);
		console.log(`1 Day Cancel Rate: ${can1}%`);
		rows.push(await createRow("Cancellation", "Cancellation", "Total Cancellation Rate - 1d", 4, 2, can1, "<", "%"));
		//
		const can7 = await cancellations(7);
		console.log(`7 Day Cancel Rate: ${can7}%`);
		rows.push(await createRow("Cancellation", "Cancellation", "Total Cancellation Rate - 7d", 3, 2, can7, "<", "%"));
		//
		const svdc1 = await storeVendorDCCancel(1);
		console.log(`1 Day Store, Vendor and DC Cancels: ${svdc1}%`);
		rows.push(await createRow("Cancellation", "Cancellation", "Rate of Order Cancellations Sourcing from Fulfillment - 1d", 60, 30, svdc1, "<", "%"));
		//
		const acr = await allCancelRates(1);
		console.log(`Highest Cancel Rate of 1, 7, 30, 90, 365 Day Intervals: ${acr}%`);
		rows.push(await createRow("Cancellation", "Cancellation", `Highest Cancel Rate of 1d, 7d, 30d, 90d, and 365d Intervals - Current`, 3, 1.5, acr, "<", "%"));
		//
		const ctsov = await cancelToStoreOrVendor();
		console.log(`Cancel Rate to Store or Vendor: ${ctsov}%`);
		rows.push(await createRow("Cancellation", "Cancellation", `Rate of Cancels to Store or Vendor - 1d`, 50, 40, ctsov, "<", "%"));
		//
		const coct = await currentOpenCriticalTickets();
		console.log(`Current Unresolved Critical Issues: ${coct}`);
		rows.push(await createRow("Critical Tickets", "DevOps", "Open Critical Tickets - Current", 0, 0, coct, "<=", ""));
		//
		const ctc = await criticalTicketsCreated();
		console.log(`1 Day Critical Tickets Created: ${ctc}`);
		rows.push(await createRow("Critical Tickets", "DevOps", "Critical Tickets Created - 1d", 1, 0, ctc, "<=", ""));
		//
		//add orderImport query functions
		//
		const bs = await backorderedSuccessful();
		console.log(`Current Backorder Rate: ${bs.BACKORDERED}%`);
		rows.push(await createRow("Allocated vs. Released", "Processing", "Rate of New Orders on Backorder - 1d", 1, 0.55, bs.BACKORDERED, "<", "%"));
		//
		console.log(`Current Success Rate: ${bs.SUCCESSFUL}%`);
		rows.push(await createRow("Allocated vs. Released", "Processing", "Rate of New Orders Released to Fulfillment (exceptions include, hold, remorse) - 1d", 97, 100, bs.SUCCESSFUL, ">=", "%"));
		//
		const sia = await stuckInAllocated();
		console.log(`Orders Stuck in Allocated, Not On Hold: ${sia}`);
		rows.push(await createRow("Allocated vs. Released", "Processing", "Orders Stuck in Allocated and Not On Hold - Current", 5, 0, sia, "<=", ""));
		//
		const ttr = await timeToRelease();
		console.log(`Average N97 Time to Release for ITS: ${ttr.ITS} minutes`);
		rows.push(await createRow("Allocated vs. Released", "Processing", "N[97] Avg. Time to Release by Brand: ITS - 1d", 180, 70, ttr.ITS, "<", "m"));
		//
		console.log(`Average N97 Time to Release for LEA: ${ttr.LEA} minutes`);
		rows.push(await createRow("Allocated vs. Released", "Processing", "N[97] Avg. Time to Release by Brand: LEA - 1d", 180, 70, ttr.LEA, "<", "m"));
		//
		console.log(`Average N97 Time to Release for LPS: ${ttr.LPS} minutes`);
		rows.push(await createRow("Allocated vs. Released", "Processing", "N[97] Avg. Time to Release by Brand: LPS - 1d", 90, 70, ttr.LPS, "<", "m"));
		//
		console.log(`Average N97 Time to Release for PSW: ${ttr.PSW} minutes`);
		rows.push(await createRow("Allocated vs. Released", "Processing", "N[97] Avg. Time to Release by Brand: PSW - 1d", 180, 70, ttr.PSW, "<", "m"));
		//
		console.log(`Average N97 Time to Release for PRO: ${ttr.PRO} minutes`);
		rows.push(await createRow("Allocated vs. Released", "Processing", "N[97] Avg. Time to Release by Brand: PRO - 1d", 240, 70, ttr.PRO, "<", "m"));
		//
		console.log(`Average N97 Time to Release for MP: ${ttr.MP} minutes`);
		rows.push(await createRow("Allocated vs. Released", "Processing", "N[97] Avg. Time to Release by Brand: MP - 1d", 15, 10, ttr.MP, "<", "m"));
		//
		const ytdsr = await successRate(true);
		console.log(`STS YTD Success Rate: ${ytdsr}%`);
		rows.push(await createRow("STS Success Rate", "Fulfillment", "SFS Success Rate - Fiscal YTD", 85, 93, ytdsr, ">=", "%"));
		//
		const tdsr = await successRate(false);
		console.log(`STS YTD Success Rate: ${tdsr}%`);
		rows.push(await createRow("STS Success Rate", "Fulfillment", "SFS Success Rate - 30d", 85, 93, tdsr, ">=", "%"));
		//
		const psrthree = await promiseSuccessRate(3);
		console.log(`Promise Date Success Rate - 3d: ${psrthree}%`);
		rows.push(await createRow("Promise Dates", "Fulfillment", "Promise Date Success Rate - 3d", 85, 97, psrthree, ">=", "%"));
		//
		const psrseven = await promiseSuccessRate(7);
		console.log(`Promise Date Success Rate - 7d: ${psrseven}%`);
		rows.push(await createRow("Promise Dates", "Fulfillment", "Promise Date Success Rate - 7d", 85, 97, psrseven, ">=", "%"));
		//
		const psrthirty = await promiseSuccessRate(30);
		console.log(`Promise Date Success Rate - 30d: ${psrthirty}%`);
		rows.push(await createRow("Promise Dates", "Fulfillment", "Promise Date Success Rate - 30d", 85, 97, psrthirty, ">=", "%"));
		//
		const odfill = await fillRate(1);
		odfill.forEach(async (line) => {
			console.log(`1 Day Fill Rate for ${line.FULFILLMENT_TYPE}: ${line.FILL_RATE}%`);
			switch (line.FULFILLMENT_TYPE) {
				case "3PL":
					rows.push(await createRow("BO/Vendor/Store Fulfillment", "Fulfillment", `3PL Fill Rate - 1d`, 95, 97, line.FILL_RATE, ">=", "%"));
					break;
				case "DropShipVendor":
					rows.push(await createRow("BO/Vendor/Store Fulfillment", "Fulfillment", `Vendor Fill Rate - 1d`, 90, 93, line.FILL_RATE, ">=", "%"));
					break;
				case "OwnedWM":
					rows.push(await createRow("BO/Vendor/Store Fulfillment", "Fulfillment", `DC Fill Rate - 1d`, 97, 98.5, line.FILL_RATE, ">=", "%"));
					break;
				case "StoreRegular":
					rows.push(await createRow("BO/Vendor/Store Fulfillment", "Fulfillment", `Store Fill Rate - 1d`, 80, 85, line.FILL_RATE, ">=", "%"));
					break;
			}
		});
		//
		const owfill = await fillRate(7);
		owfill.forEach(async (line) => {
			console.log(`7 Day Fill Rate for ${line.FULFILLMENT_TYPE}: ${line.FILL_RATE}%`);
			switch (line.FULFILLMENT_TYPE) {
				case "3PL":
					rows.push(await createRow("BO/Vendor/Store Fulfillment", "Fulfillment", `3PL Fill Rate - 7d`, 95, 97, line.FILL_RATE, ">=", "%"));
					break;
				case "DropShipVendor":
					rows.push(await createRow("BO/Vendor/Store Fulfillment", "Fulfillment", `Vendor Fill Rate - 7d`, 90, 93, line.FILL_RATE, ">=", "%"));
					break;
				case "OwnedWM":
					rows.push(await createRow("BO/Vendor/Store Fulfillment", "Fulfillment", `DC Fill Rate - 7d`, 97, 98.5, line.FILL_RATE, ">=", "%"));
					break;
				case "StoreRegular":
					rows.push(await createRow("BO/Vendor/Store Fulfillment", "Fulfillment", `Store Fill Rate - 7d`, 80, 85, line.FILL_RATE, ">=", "%"));
					break;
			}
		});
		//
		const sufrod = await uniqueStoreFillRate(1);
		console.log(`1 Day Store Unique Fill Rate: ${sufrod}%`);
		rows.push(await createRow("BO/Vendor/Store Fulfillment", "Fulfillment", `Store Unique Fill Rate - 1d`, 80, 85, sufrod, ">=", "%"));
		//
		const sufrow = await uniqueStoreFillRate(7);
		console.log(`7 Day Store Unique Fill Rate: ${sufrow}%`);
		rows.push(await createRow("BO/Vendor/Store Fulfillment", "Fulfillment", `Store Unique Fill Rate - 7d`, 80, 85, sufrod, ">=", "%"));
		//
		const sfod = await storeFirstFillRates(1);
		console.log(`1 Day Store First Fill Rate: ${sfod}%`);
		rows.push(await createRow("BO/Vendor/Store Fulfillment", "Fulfillment", `Store First Fill Rate - 1d`, 80, 85, sufrod, ">=", "%"));
		//
		const sfow = await storeFirstFillRates(7);
		console.log(`7 Day Store First Fill Rate: ${sfow}%`);
		rows.push(await createRow("BO/Vendor/Store Fulfillment", "Fulfillment", `Store First Fill Rate - 7d`, 80, 85, sufrod, ">=", "%"));
		//
		const odfr = await failRate(1);
		console.log(`1 Day Max Payment Failure Rate: ${odfr.CARD_TYPE}, ${odfr.FAILURE_RATE}%`);
		rows.push(await createRow("Settlement/Reauth Failure", "Payment", `Credit Card Fail Rate - 1d`, 10, 1.5, `${odfr.CARD_TYPE}: ${odfr.FAILURE_RATE}`, "<", "%"));
		//
		const owfr = await failRate(7);
		console.log(`7 Day Max Payment Failure Rate: ${owfr.CARD_TYPE}, ${owfr.FAILURE_RATE}%`);
		rows.push(await createRow("Settlement/Reauth Failure", "Payment", `Credit Card Fail Rate - 7d`, 2, 1, `${owfr.CARD_TYPE}: ${owfr.FAILURE_RATE}`, "<", "%"));
		//
		const tdfr = await failRate(30);
		console.log(`30 Day Max Payment Failure Rate: ${tdfr.CARD_TYPE}, ${tdfr.FAILURE_RATE}%`);
		rows.push(await createRow("Settlement/Reauth Failure", "Payment", `Credit Card Fail Rate - 30d`, 1.5, 0.5, `${tdfr.CARD_TYPE}: ${tdfr.FAILURE_RATE}`, "<", "%"));
		//
		const rrsixty = await returnRate(60);
		console.log(`60 Day Return Rate: ${rrsixty}`);
		rows.push(await createRow("Returns (Blind), Rate, Age", "Returns", `Return Rate - 60d`, 5, 2.5, rrsixty, "<", "%"));
		//
		const rryear = await returnRate(365);
		console.log(`365 Day Return Rate: ${rryear}`);
		rows.push(await createRow("Returns (Blind), Rate, Age", "Returns", `Return Rate - 365d`, 5, 2.5, rryear, "<", "%"));
		//
		const odbxmp = await blindReturns(1, false);
		console.log(`1 Day Blind Return Rate (Excluding Marketplace): ${odbxmp}%`);
		rows.push(await createRow("Returns (Blind), Rate, Age", "Returns", `Blind Returns (Non-Marketplace) - 1d`, 30, 15, odbxmp, "<", "%"));
		//
		const owbxmp = await blindReturns(7, false);
		console.log(`7 Day Blind Return Rate (Excluding Marketplace): ${owbxmp}%`);
		rows.push(await createRow("Returns (Blind), Rate, Age", "Returns", `Blind Returns (Non-Marketplace) - 7d`, 60, 25, owbxmp, "<", "%"));
		//
		const odbmp = await blindReturns(1, true);
		console.log(`1 Day Blind Return Rate for Marketplace: ${odbmp}`);
		rows.push(await createRow("Returns (Blind), Rate, Age", "Returns", `Blind Returns (Marketplace) - 1d`, 50, 15, odbmp, "<", "%"));
		//
		const oprat = await openRates();
		oprat.forEach(async (line) => {
			switch (Object.keys(line)[0]) {
				case "3PL":
					console.log(`Orders Open 2-3 Days Rate for 3PL: ${Object.values(line)[0]}%`);
					rows.push(await createRow("Order Aging", "Fulfillment", "Rate of Open 3PL Orders for 2-3d - Current", 1, 0.5, Object.values(line)[0], "<", "%"));
					break;
				case "DropShipVendor":
					console.log(`Orders Open 2-3 Days Rate for Vendor: ${Object.values(line)[0]}%`);
					rows.push(await createRow("Order Aging", "Fulfillment", "Rate of Open Vendor Orders for 2-3d - Current", 10, 5, Object.values(line)[0], "<", "%"));
					break;
				case "OwnedWM":
					console.log(`Orders Open 2-3 Days Rate for DC: ${Object.values(line)[0]}%`);
					rows.push(await createRow("Order Aging", "Fulfillment", "Rate of Open DC Orders for 2-3d - Current", 1, 0.5, Object.values(line)[0], "<", "%"));
					break;
				case "StoreRegular":
					console.log(`Orders Open 2-3 Days Rate for Stores: ${Object.values(line)[0]}%`);
					rows.push(await createRow("Order Aging", "Fulfillment", "Rate of Open Store Orders for 2-3d - Current", 5, 1, Object.values(line)[0], "<", "%"));
					break;
				case "SevenDayOpen":
					console.log(`Orders Open 7 Days Rate: ${Object.values(line)[0]}%`);
					rows.push(await createRow("Order Aging", "Fulfillment", "Rate of Open Orders 7-30d - Current", 20, 10, Object.values(line)[0], "<", "%"));
					break;
				case "ThirtyDayOpenDC3PLStore":
					console.log(`Orders Open 30 Days Rate for DC, 3PL, and Store: ${Object.values(line)[0]}%`);
					rows.push(await createRow("Order Aging", "Fulfillment", "Rate of Open Orders Open 30d+ (non-Vendor) - Current", 5, 2.5, Object.values(line)[0], "<", "%"));
					break;
				case "OpenThirtyDays":
					console.log(`Orders Open 30 Days: ${Object.values(line)[0]}`);
					rows.push(await createRow("Order Aging", "Fulfillment", "Total Open Orders 30d+ - Current", 300, 150, Object.values(line)[0], "<", ""));
					break;
				case "VendorThirtyDayRate":
					console.log(`Orders Open 30 Days Rate for Vendor: ${Object.values(line)[0]}%`);
					rows.push(await createRow("Order Aging", "Fulfillment", "Rate of Open Vendor Orders Open 30d+ - Current", 10, 5, Object.values(line)[0], "<", "%"));
					break;
				case "VendorSevenDayRate":
					console.log(`Orders Open 7 Days Rate for Vendor: ${Object.values(line)[0]}%`);
					rows.push(await createRow("Order Aging", "Fulfillment", "Rate of Open Vendor Orders for 7-30d - Current", 20, 10, Object.values(line)[0], "<", "%"));
					break;
				case "OneDayTotal":
					oneDayTotal = Object.values(line)[0];
					break;
				case "TwoDayTotal":
					twoDayTotal = Object.values(line)[0];
					break;
				case "TotalOrders":
					totalOrders = Object.values(line)[0];
					break;
			}
		});
		//
		const borat = await backorderRates(oneDayTotal, twoDayTotal, totalOrders);
		borat.forEach(async (line) => {
			switch (Object.keys(line)[0]) {
				case "BackorderOneDay":
					console.log(`Backorder Rate for 1 Day: ${Object.values(line)[0]}%`);
					rows.push(await createRow("Order Aging", "Fulfillment", "Rate of Backordered Orders Open for 1d - Current", 2, 2, Object.values(line)[0], "<", "%"));
					break;
				case "BackorderThirtyDay":
					console.log(`Backorder Rate for 30 Days: ${Object.values(line)[0]}%`);
					rows.push(await createRow("Order Aging", "Fulfillment", "Rate of Backordered Orders Open for 30d+ - Current", 30, 15, Object.values(line)[0], "<", "%"));
					break;
				case "AllocatedTwoDay":
					console.log(`Allocated Rate for 2 Days: ${Object.values(line)[0]}%`);
					rows.push(await createRow("Order Aging", "Fulfillment", "Rate of Allocated Orders Open for 1-2d - Current", 10, 5, Object.values(line)[0], "<", "%"));
					break;
				case "AllocatedThirtyDayRate":
					console.log(`Allocated Rate for 30 Days: ${Object.values(line)[0]}%`);
					rows.push(await createRow("Order Aging", "Fulfillment", "Rate of Allocated Orders Open for 30d+ - Current", 5, 2, Object.values(line)[0], "<", "%"));
					break;
				case "AllocatedThirtyDayTotal":
					console.log(`Allocated Total for 30 days: ${Object.values(line)[0]}`);
					rows.push(await createRow("Order Aging", "Fulfillment", "Total Allocated Orders Open for 30d+ - Current", 50, 25, Object.values(line)[0], "<", ""));
					break;
				case "AllocatedTenDayTotal":
					console.log(`Allocated Total for 10 days: ${Object.values(line)[0]}`);
					rows.push(await createRow("Order Aging", "Fulfillment", "Total Allocated Orders Open for 10d+ - Current", 100, 25, Object.values(line)[0], "<", ""));
					break;
			}
		});
		//
		const rts = await returnToShelf();
		console.log(`Orders Returned to Pick Shelf: ${rts}`);
		rows.push(await createRow("Order Aging", "Fulfillment", "Orders Returned to Pick Shelf - 3d", 50, 30, rts, "<", ""));
		//
		const sps = await stalePickStatus();
		console.log(`Orders Stale in Pick Status: ${sps}`);
		rows.push(await createRow("Order Aging", "Fulfillment", "Orders Stale in Pick Status - Current", 25, 5, sps, "<", ""));
		//
		const odusfrvsfr = Math.floor(Math.abs(Object.values(odfill.find((line) => line.FULFILLMENT_TYPE === "StoreRegular"))[1] - sufrod) * 100) / 100;
		console.log(`Unique Store Fill Rate vs Store Fill Rate: ${odusfrvsfr}%`);
		rows.push(await createRow("Bounce Report", "Store Performance", "Unique Store Fill Rate vs. Store fill Rate - 1d", 10, 5, odusfrvsfr, "<", "%"));
		//
		const sbr = await storeBounceRate();
		console.log(`Store Bounce Rate 1 Day: ${sbr}%`);
		rows.push(await createRow("Bounce Report", "Store Performance", "Store Bounce Rate - 1d", 3, 1.5, sbr, "<", "%"));
		//
		const tb = await tenBounce();
		console.log(`Open Orders that have Bounced to Stores 10 Times or More: ${tb}`);
		rows.push(await createRow("Bounce Report", "Store Performance", "Total Open Orders that have Bounced 10+ times - Current", 100, 50, tb, "<", ""));
		//
		const utb = await uniqueTenBounce();
		console.log(`Open Orders that have Bounced to the Same Store 10 Times or More: ${utb}`);
		rows.push(await createRow("Bounce Report", "Store Performance", "Total Open Orders that have Bounced to the Same Store 10+ times - Current", 5, 2, utb, "<", ""));
		//
		const uvfr = await uniqueVendorFillRate(1);
		const oduvfrvvfr = Math.floor(Math.abs(Object.values(odfill.find((line) => line.FULFILLMENT_TYPE === "DropShipVendor"))[1] - uvfr) * 100) / 100;
		console.log(`Unique Vendor Fill Rate vs Vendor Fill Rate: ${oduvfrvvfr}%`);
		rows.push(await createRow("Bounce Report", "Store Performance", "Unique Vendor Fill Rate vs. Vendor Fill Rate - 1d", 5, 2, oduvfrvvfr, "<", "%"));
		//
		const vbr = await vendorBounceRate();
		console.log(`Vendor Bounce Rate: ${vbr}%`);
		rows.push(await createRow("Bounce Report", "Store Performance", "Vendor Bounce Rate - 1d", 1.2, 1.1, vbr, "<", "%"));
		//
		const vtb = await vendorTenBounce();
		console.log(`Open Orders that have Bounced to Vendors 10 Times or More: ${vtb}`);
		rows.push(await createRow("Bounce Report", "Store Performance", "Total Open Vendor Orders that have Bounced 10+ times - Current", 25, 5, vtb, "<", ""));
		//
		const bls = await bopisLineShorts();
		const blc = await bopisLineCancels();
		const bcr = Math.floor((bls / blc) * 10000) / 100;
		console.log(`BOPIS Cancellation Rate: ${bcr}%`);
		rows.push(await createRow("Bounce Report", "Store Performance", "BOPIS Cancellation Rate", 7, 5, bcr, "<", "%"));
		console.log(rows);
		//
		// add JDA query functions
		//
		console.log("-----");
		rows.forEach((r, i) => {
			r.forEach((c, j) => {
				const cell = worksheet.getCell(`${letters[j] + (i + 1)}`);
				console.log(letters[j] + (i + 1));
				cell.value = c;
				cell.border = {
					top: { style: "medium" },
					left: { style: "medium" },
					bottom: { style: "medium" },
					right: { style: "medium" },
				};
				cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
				if (i === 0) {
					cell.font = { name: "Calibri", size: 9, bold: true };
				} else {
					cell.font = { name: "Calibri", size: 9 };
				}
				if (j === 6) {
					switch (c) {
						case "Exceeds SLA":
							cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF008000" } };
							break;
						case "Meets SLA":
							cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF90EE90" } };
							break;
						case "Fails to meet SLA":
							cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } };
							break;
					}
				}
			});
		});
		worksheet.getColumn("A").width = 20;
		worksheet.getColumn("B").width = 14;
		worksheet.getColumn("C").width = 57;
		worksheet.getColumn("D").width = 8;
		worksheet.getColumn("E").width = 8;
		worksheet.getColumn("F").width = 14;
		worksheet.getColumn("G").width = 14;
		worksheet.getColumn("H").width = 20;
		await workbook.xlsx.writeFile("GBG.xlsx");
	} catch (e) {
		console.error(e);
	}
	process.exit();
}

async function createRow(src, cat, met, sla, tar, act, ind, typ, res = "") {
	if (cat === "Payment") {
		let catException = act.split(" ");
		oper[ind](Number(catException[1]), tar) ? (res = "Exceeds SLA") : oper[ind](Number(catException[1]), sla) ? (res = "Meets SLA") : (res = "Fails to meet SLA");
		return [src, cat, met, `${ind} ${sla}${typ}`, `${tar === 100 || tar === 0 ? "" : ind} ${tar}${tar === 100 || tar === 0 ? "" : typ}`, `${act}${typ}`, res, ""];
	}
	oper[ind](act, tar) ? (res = "Exceeds SLA") : oper[ind](act, sla) ? (res = "Meets SLA") : (res = "Fails to meet SLA");
	return [src, cat, met, `${ind} ${sla}${typ}`, `${tar === 100 || tar === 0 ? "" : ind} ${tar}${tar === 100 || tar === 0 ? "" : typ}`, `${act}${typ}`, res, ""];
}

buildReport();
