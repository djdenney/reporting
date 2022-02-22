require("dotenv").config();
const knex = require("knex")({
	client: "mysql",
	connection: {
		host: process.env.DB_IP,
		port: 3306,
		user: process.env.DB_UID,
		password: process.env.DB_KEY,
	},
});

module.exports = knex;
