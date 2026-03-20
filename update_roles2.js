const db = require('./backend/config/db');

async function run() {
  try {
    await db.query("UPDATE users SET role='user'");
    await db.query("UPDATE users SET role='admin' WHERE email='serhatglgc@gmail.com'");
    console.log("Roles updated successfully");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
run();
