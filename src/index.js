const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');

const app = express();

const REPO_URL_BASE = process.env.REPO_URL_BASE || 'https://repo.maven.apache.org/maven2';
const PORT = process.env.PORT || 80;
const REDIRECT_URL_REMOVE = process.env.REDIRECT_URL_REMOVE || '';

app.get('*path', async (req, res) => {
  const path = req.path
  if (path.startsWith(REDIRECT_URL_REMOVE)) {
    path = path.slice(REDIRECT_URL_REMOVE.length);
  }
  const pathArr = path.split("/")
  
  const regex = /-latest\.[\w.]+$/;
  if (!regex.test(pathArr[pathArr.length -1])) {
    res.redirect(REPO_URL_BASE + path);
    return;
  }

  try {
  
    const paths = [...pathArr];
    paths.pop();
    paths.push('maven-metadata.xml');
    res.redirect(REPO_URL_BASE + paths.join("/"));
    
    const response = await axios.get(metadataURL);
    const metadata = await xml2js.parseStringPromise(response.data);
    
    const snapshotVersion = metadata['metadata']['versioning'][0]['snapshotVersions'][0]['snapshotVersion'][1]['value'][0]

    paths.pop();
    let finalURL = REPO_URL_BASE + paths.join('/') + "/" + pathArr[pathArr.length - 1].replace("latest", snapshotVersion)

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
