const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');

const app = express();

const REPO_URL_BASE = process.env.REPO_URL_BASE || 'https://repo.maven.apache.org/maven2';
const PORT = process.env.PORT || 80;


app.get('*path', async (req, res) => {

  try {
    // /{groupId}/{artifactID}/{version}/{artifactID}-{version}.jar
    const pathArr = req.path.split("/")

    // {version}
    const version = pathArr[pathArr.length - 2];

    // check if {version} ends with -SNAPSHOT
    if (!version.toUpperCase().endsWith("-SNAPSHOT")) {
      res.sendStatus(404);
      return;
    }
    
    const headers = {};
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }

    // /{groupId}/{artifactID}/{version}/maven-metadata.xml
    const paths = [...pathArr];
    paths.pop();
    paths.push('maven-metadata.xml');

    // {REPO_URL_BASE} /{groupId}/{artifactID}/{version}/maven-metadata.xml
    const metadataURL = REPO_URL_BASE + paths.join("/");
    
    const response = await axios.get(metadataURL, {headers});
    const metadata = await xml2js.parseStringPromise(response.data);

    // <snapshotVersions> array
    const snapshotVersions = metadata?.metadata?.versioning?.[0]?.snapshotVersions?.[0]?.snapshotVersion;

    // get latest <snapshotVersion>
    const jarSnapshot = snapshotVersions?.find(v => v.extension?.[0] === 'jar');
    const snapshotVersion = jarSnapshot?.value?.[0];

    if (!snapshotVersion) {
      throw new Error('Snapshot version not found in metadata.');
    }

    paths.pop();

    // {REPO_URL_BASE} /{groupId}/{artifactID}/{version} / {artifactID}-{version}.jar -> replace 
    const finalURL = REPO_URL_BASE + paths.join('/') + "/" + pathArr[pathArr.length - 1].replace(version, snapshotVersion)
    const fileResponse = await axios.get(finalURL, {
      headers, 
      responseType: 'stream'
    });

    res.status(fileResponse.status);
    for (const [key, value] of Object.entries(fileResponse.headers)) {
      res.setHeader(key, value);
    }
    fileResponse.data.pipe(res);

    return;
  } catch (err) {
    console.error(err);
  }
  res.sendStatus(404);
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
