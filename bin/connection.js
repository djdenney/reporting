require("dotenv").config();
//let { args } = require("./index")
//console.log(args)
let args = []

const knex = require("knex")({
	client: "mysql",
	connection: {
		host: args.length !== 0 ? Object.values(args.find((arg) => Object.keys(arg)[0] === "host"))[0] : process.env.DB_URL,
		port: 3306,
		user: args.length !== 0 ? Object.values(args.find((arg) => Object.keys(arg)[0] === "uid"))[0] : process.env.DB_UID,
		password: args.length !== 0 ? Object.values(args.find((arg) => Object.keys(arg)[0] === "pw"))[0] : process.env.DB_KEY,
	},
});

module.exports = knex;
