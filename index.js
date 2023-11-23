const puppeteer = require("puppeteer-extra");

const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

const url = "https://odibets.com/league";

const runProgram = async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 600 });

  await page.goto(url);

  // Select current happening events
  await page.waitForSelector(".l-league-games-matches");

  const currentEvents = await page.$$(".event");

  const currentMatches = [];
  for (const event of currentEvents) {
    const homeTeam = await event.$eval(".team:nth-child(1)", (team) => team.textContent.trim());
    const awayTeam = await event.$eval(".team:nth-child(3)", (team) => team.textContent.trim());

    const homeOdds = await event.$eval(".d-1 button:nth-child(1) span:nth-child(2)", (odds) => parseFloat(odds.textContent));
    const drawOdds = await event.$eval(".d-1 button:nth-child(2) span:nth-child(2)", (odds) => parseFloat(odds.textContent));
    const awayOdds = await event.$eval(".d-1 button:nth-child(3) span:nth-child(2)", (odds) => parseFloat(odds.textContent));
    const highestOdds = homeOdds > awayOdds ? homeOdds : awayOdds;
    currentMatches.push({
      homeTeam,
      awayTeam,
      homeOdds,
      drawOdds,
      awayOdds,
      highestOdds,
    });
  }

  const pickedMatch = currentMatches.sort((a, b) => b.highestOdds - a.highestOdds)[0];

  if (pickedMatch.highestOdds >= 5) {
    // Get the recent results
    await page.click(".l-leagues-tabs > li:nth-child(2)");
    await page.waitForTimeout(2000);

    const favouredTeam = pickedMatch.homeOdds > pickedMatch.awayOdds ? pickedMatch.awayTeam : pickedMatch.homeTeam;

    // Get the last 3 results of the favoured team
    const matches = await page.$$(".results table tr.results-body");

    const previousMatches = [];
    for (const match of matches.slice(0, 30)) {
      const homeTeam = await match.$eval("td:nth-child(1)", (team) => team.textContent.trim());
      const awayTeam = await match.$eval("td:nth-child(3)", (team) => team.textContent.trim());

      const scores = await match.$eval("td:nth-child(2)", (score) => score.textContent.trim());
      const homeScore = parseInt(scores[0]);
      const awayScore = parseInt(scores[1]);

      if (homeTeam === favouredTeam || awayTeam === favouredTeam) {
        previousMatches.push({ homeTeam, awayTeam, homeScore, awayScore });
      }
    }

    // Check if the favouredTeam won all the previous matches
    let wonMatches = 0;
    for (const prevMatch of previousMatches) {
      const won = prevMatch.homeTeam === favouredTeam ? prevMatch.homeScore > prevMatch.awayScore : prevMatch.awayScore > prevMatch.homeScore;
      won && wonMatches++;
    }

    console.log(wonMatches, new Date().toLocaleTimeString());
    if (wonMatches === 3) {
      console.log(pickedMatch);
    }
  }

  await browser.close();
};

setInterval(() => {
  const date = new Date();
  const mins = date.getMinutes();
  const secs = date.getSeconds();

  if (mins % 2 !== 0 && secs < 10) {
    runProgram();
  }
}, 10000);
