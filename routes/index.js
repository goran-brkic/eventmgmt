var express = require('express');
var router = express.Router();
const { auth } = require("express-oauth2-jwt-bearer");
const jwtAuthz = require('express-jwt-authz');
const axios = require('axios');

const pool = require("../db");

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Welcome' });
});

router.get("/auth_config.json", function (req, res) {
  res.json({
      "domain": "https://dev-7xjdvaspwt881ruz.eu.auth0.com",
      "clientId": '85uAjCVwCEa6WDw5cW5fItRp6djgZBw1',
      "audience": 'https://eventmgmt.com',
  });
});

router.get('/database', async function(req, res, next) {
  let podaci = undefined;
  let csv_query = undefined;
  let json_query = undefined;
  if(req.query.polje){
    podaci = await pool.query(`SELECT * FROM hoteli NATURAL JOIN pogodnosti NATURAL JOIN lokacije`);
  }
  res.render('database', { title: 'Database', podaci: podaci.rows, csv: csv_query ? true : false, json: json_query ? true : false });
});

router.get('/update', (req, res) => {
  return res.status(401).send({ msg: "Error: Invalid token" });
});

router.get('/profile', (req, res) => {
  return res.status(401).send({ msg: "Error: Invalid token" });
});

router.post('/profile', function(req, res, next) {
  if(parseJwt(req.body.token1).permissions[0] == 'read:profile')
    res.render('profile', { title: 'Moj Profil' });
  else
    res.redirect('/');
});

router.post('/update', async function(req, res, next) {
  if(parseJwt(req.body.token2).permissions[1] == 'update:database'){
    csv_query = await pool.query(`COPY( 
      SELECT hoteli.naziv, hoteli.grad, hoteli.zemlja, hoteli.adresa, hoteli.godina_osnutka, hoteli.tel, hoteli.email, hoteli.url, hoteli.br_soba, hoteli.br_zvjezdica,
      string_agg('besplatan-wifi ' || pogodnosti.besplatan_wifi || ';bazen ' || pogodnosti.bazen || ';pet-friendly ' || pogodnosti.pet_friendly, ';') as pogodnosti,
      string_agg('sirina ' || lokacije.sirina || ';duzina ' || lokacije.duzina, ';') as lokacija
      FROM hoteli JOIN pogodnosti ON hoteli.hotel_id = pogodnosti.hotel_id
      JOIN lokacije ON hoteli.hotel_id = lokacije.hotel_id
      GROUP BY hoteli.naziv, hoteli.grad, hoteli.zemlja, hoteli.adresa, hoteli.godina_osnutka, hoteli.tel, hoteli.email, hoteli.url, hoteli.br_soba, hoteli.br_zvjezdica
      )
      TO 'F:/lab2/public/files/naziv_skupa.csv' with DELIMITER ',' CSV HEADER;`);

    json_query = await pool.query(`COPY(
      select array_to_json(array_agg(row_to_json(t))) from ( 
      SELECT hoteli.naziv, hoteli.grad, hoteli.zemlja, hoteli.adresa, hoteli.godina_osnutka, hoteli.tel, hoteli.email, hoteli.url, hoteli.br_soba, hoteli.br_zvjezdica,
        coalesce(json_agg(
              json_build_object( 
                  'besplatan_wifi', pogodnosti.besplatan_wifi, 
                  'unutarnji bazen', pogodnosti.bazen,
            'pet-friendly', pogodnosti.pet_friendly
              ))) as pogodnosti,
        coalesce(json_agg(
              json_build_object( 
                  'sirina', lokacije.sirina, 
                  'duzina', lokacije.duzina
              ))) as lokacija
      FROM hoteli JOIN pogodnosti ON hoteli.hotel_id = pogodnosti.hotel_id
      JOIN lokacije ON hoteli.hotel_id = lokacije.hotel_id
      GROUP BY hoteli.naziv, hoteli.grad, hoteli.zemlja, hoteli.adresa, hoteli.godina_osnutka, hoteli.tel, hoteli.email, hoteli.url, hoteli.br_soba, hoteli.br_zvjezdica) t
      )
      TO 'F:/lab2/public/files/naziv_skupa.json';`);

      res.render('index', { title: 'Welcome' });
   } else {
     res.redirect('/');
   }
});

function parseJwt (token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
}

module.exports = router;
