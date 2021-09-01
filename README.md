# MagicMirror-FootballLeagues
This [Magic Mirror Module](https://github.com/MichMich/MagicMirror) is losely based on [MMM-SoccerLiveScore](https://github.com/LukeSkywalker92/MMM-SoccerLiveScore). The code is cleaner, commented and uses an open and documented API. Logos are currently not yet implemented, since I haven't found a documented api.

## Preview
League Table

![alt text](https://i.imgur.com/8QORZUX.png "Logo Title Text 1")

Fixtures

![alt text](https://i.imgur.com/8dMv25Y.png "Logo Title Text 1")


## Installation

Navigate into your MagicMirror's modules folder and execute 
```git
git clone https://github.com/master117/MagicMirror-FootballLeagues
```

Install fetch
```nodejs
npm install node-fetch
```


## Configuration
This module uses the MagicMirror standard configuration file config.js. Available options are:

| Option | Values |
| - | - |
| apiKey | Api-Key for [football-data.org](https://api.football-data.org/index) the API used for aquiring data. A free API key can be aquired [here](https://api.football-data.org/client/register). |
| leagues | List of league-ID's you want to display. If you put more than one league the module switches automatically between them. A table with possible leagues and the related ID's can be found further down. <br><br> <b>Type:</b> Integer <br> <b> Example: </b> `[ 452, 453 ]` 1. Bundesliga 2017/18, 2. Bundesliga 2017/18 <br> <b> Default: </b> `[ 452 ]` |
| showNames | Toggles if team-names are shown. <br> <br><b> Default Value: </b> `true` |
| displayTime | Defines how long one league is shown, if you have more than one League in the leagues-value. In Milliseconds. <br><br><b> Default Value: </b> `60 * 1000` which is 6000 ms or 1 min. |
| showTables | Toggles if tables are shown if the league has a table. <br><br><b> Default Value: </b> `true` |
| showLogos | Toggles if Logos are shown if logos exist! <br><br><b> Default Value: </b> `true` |

Here is an example of an entry in `config.js`

```javascript
{
	module: 'MagicMirror-FootballLeagues',
	position: 'top_left',
	header: 'Live-Scores',
	config: {
		leagues: [2002],
        	showNames: true,
        	displayTime: 60 * 1000,
        	showTables: true,
		showLogos: true,
		apiKey: 'MySuperSecretKey'
	}
},
```

### Data Source - Updated to V2
All Data is from: [football-data.org](https://www.football-data.org/)

Sadly football-data.org has introduced [Tiers and Pricing](https://www.football-data.org/pricing)
which means:

1. You need a key from their site to use this tool. A free API key can be aquired [here](https://api.football-data.org/client/register).

2. There is only a few leagues available, only 10 updates per minute and delayed scores (not live) in the free version.

### Available FREE IDs / Leagues
All Updated ID's, including paid ones if you pay for their service, [can be found here](http://api.football-data.org/v2/competitions/).

| ID | League |
| - | - |
| 2013 | Série A |
| 2016 | Championship |
| 2021 | Premier League |
| 2001 | UEFA Champions League |
| 2018 | European Championship |
| 2015 | Ligue 1 |
| 2002 | Bundesliga |
| 2019 | Serie A |
| 2003 | Eredivisie |
| 2017 | Primeira Liga |
| 2014 | Primera Division |
| 2000 | FIFA World Cup |

Legacy, if using older versions of this tool:

| ID | League |
| - | - |
| 444 | Campeonato Brasileiro da Série A | 
| 445 | Premier League 2017/18 |
| 446 | Championship 2017/18 |
| 447 | League One 2017/18 |
| 448 | League Two 2017/18 |
| 449 | Eredivisie 2017/18 |
| 450 | Ligue 1 2017/18 |
| 451 | Ligue 2 2017/18 |
| 452 | 1. Bundesliga 2017/18 |
| 453 | 2. Bundesliga 2017/18 |
| 455 | Primera Division 2017 |
| 456 | Serie A 2017/18 |
| 457 | Primeira Liga 2017/18 |
| 458 | DFB-Pokal 2017/18 |
| 459 | Serie B 2017/18 |
| 464 | Champions League 2017/18 |
| 466 | Australian A-League | 
