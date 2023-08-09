const express = require("express");
const { Translator } = require("deepl-node");
const bodyParser = require("body-parser");
const app = express();
const port = 5678;

app.use(bodyParser.urlencoded({ extended: true }));

// Translator
const translatorFn = async (authKey, targetLang, data) => {
  const translator = new Translator(authKey);
  const sourceLang = null;
  const results = await translator.translateText(data, sourceLang, targetLang);
  const translatedObject = data.reduce((acc, item, index) => {
    acc[item] = results[index].text;
    return acc;
  }, {});
  return translatedObject;
};

// Serve the HTML file
app.get("/", (req, res) => {
  try {
    res.sendFile(__dirname + "/index.html");
  } catch {
    res.send("Something went wrong");
  }
});

function parseKeyValuePairs(input) {
  const result = {};
  const regex = /(['"])?([a-zA-Z0-9_]+)\1:\s*(['"]?)(.*?)\3/g;

  let match;
  while ((match = regex.exec(input)) !== null) {
    const key = match[2];
    const value = match[4];

    if (typeof value === "string" && value.trim() !== "") {
      result[key] = value;
    } else {
      // Invalid JSON type or empty value
      return null;
    }
  }

  return result;
}

// Middleware to process userInput
function processUserInput(req, res, next) {
  const userInput = req.body.userInput;

  try {
    const parsedInput = parseKeyValuePairs(userInput);

    if (parsedInput !== null && Object.keys(parsedInput).length > 0) {
      const valuesArray = Object.values(parsedInput).map((value) =>
        String(value)
      );
      req.processedUserInput = valuesArray;
    } else {
      throw new Error("Invalid input type");
    }
  } catch (error) {
    return res
      .status(400)
      .json({ error: "Not valid JSON or invalid input type" });
  }

  next();
}

app.post("/perform-translation", processUserInput, async (req, res) => {
  try {
    const apiKey = req.body.apiKey;
    const targetLanguage = req.body.targetLanguage;
    const processedUserInput = req.processedUserInput;
    const translatedObj = await translatorFn(
      apiKey,
      targetLanguage,
      processedUserInput
    );


    const filename = "translatedData.json"; // The filename for the downloaded JSON file

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(translatedObj, null, 2));
  } catch (error) {
    console.log(error);
    res.status(500).json("Authorization error or Usage Limit Exceeded");
  }
});

app.listen(port, () => {
  console.log(`Welcome To Deepl Node Server ${port}`);
});
