import mysql from 'mysql2/promise';

async function testConnection() {
    try {
        const connection = await mysql.createConnection({
            host: 'caboose.proxy.rlwy.net',
            user: 'root',
            port: 55239,
            password: 'nlJDIavQRHMiHBgtNmZHwnNHNrrcZisB',
            database: 'railway'
        });

        console.log("✅ Success: Connected to the database!\n");

        // 1. Fetch all table names in the current database
        const [tables] = await connection.execute('SHOW TABLES');

        console.log("📋 Tables in your database:\n");

        // 2. DataGrip/MySQL returns an array of objects. console.table makes it readable.
        if (tables.length > 0) {
            console.table(tables);
        } else {
            console.log("⚠️ No tables found. Did you run your CREATE TABLE scripts yet?");
        }

        await connection.end();

    } catch (error) {
        console.error("❌ Connection failed!");
        console.error("Error Message:", error.message);
    }
}

testConnection();
