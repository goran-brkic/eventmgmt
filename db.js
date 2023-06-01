const Pool = require('pg').Pool;

const pool = new Pool({
    user: 'eventmgmt_9lpf_user',
    password: 'fFJFUgVaPoFdnPO1nKDIrHO8HNrYDvjY',
    host: 'dpg-chs8o30rddl7at9p9s1g-a.frankfurt-postgres.render.com',
    port: 5432,
    database: 'eventmgmt_9lpf',
    ssl: true
});

/* const pool = new Pool({
    user: 'postgres',
    password: 'bazepodataka',
    host: 'localhost',
    port: 5432,
    database: 'Hoteli',
    ssl: false
}); */




module.exports = pool;