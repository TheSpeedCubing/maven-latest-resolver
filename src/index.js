const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');

const app = express();

const REPO_URL_BASE = process.env.REPO_URL_BASE || 'https://repo.maven.apache.org/maven2';
const PORT = process.env.PORT || 3000;

app.get('*path', async (req, res) => {
  const pathArr = req.path.split("/")
  
  const regex = /-latest\.[\w.]+$/;
  if (!regex.test(pathArr[pathArr.length -1])) {
    res.redirect(SONATYPE_BASE + req.path);
    console.log("REDIR")
    return;
  }

  try {
  
    const paths = [...pathArr];
    paths.pop();
    paths.push('maven-metadata.xml');
    const metadataURL = REPO_URL_BASE + paths.join('/')
    
    const response = await axios.get(metadataURL);
    const metadata = await xml2js.parseStringPromise(response.data);
    
    const snapshotVersion = metadata['metadata']['versioning'][0]['snapshotVersions'][0]['snapshotVersion'][1]['value'][0]

    paths.pop();
    const finalURL = REPO_URL_BASE + paths.join('/') + "/" + pathArr[pathArr.length - 1].replace("latest", snapshotVersion)

    console.log(req.url + " -> " + finalURL)
    res.redirect(finalURL)

  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to resolve latest jar');
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
