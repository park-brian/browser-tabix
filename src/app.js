import { RemoteFile } from "generic-filehandle";
import { TabixIndexedFile } from "@gmod/tabix";
import VCF from "@gmod/vcf";

const resultsElement = document.querySelector("#results");
const tabixForm = document.querySelector("#tabixForm");

async function loadTabixIndexedFile(url) {
  const tbiIndexed = new TabixIndexedFile({
    filehandle: new RemoteFile(url),
    tbiFilehandle: new RemoteFile(url + ".tbi"),
  });
  const headerText = await tbiIndexed.getHeader();
  const tbiVCFParser = new VCF({ header: headerText });

  return {
    tbiIndexed,
    tbiVCFParser,
  };
}

tabixForm.onsubmit = async function submit(event) {
  event.preventDefault();

  // get form values
  const form = event.target;

  const inputFileUrl = form.inputFileUrl.value;
  const chromosome = form.chromosome.value;
  const startPosition = +form.startPosition.value || 0;
  const endPosition = +form.endPosition.value || 0;

  try {
    // show loading message and disable submit button
    resultsElement.innerHTML = "Loading...";
    form.submit.disabled = true;

    const startTime = performance.now();
    const { tbiIndexed, tbiVCFParser } = await loadTabixIndexedFile(inputFileUrl);
    const variants = [];
    await tbiIndexed.getLines(chromosome, startPosition, endPosition, function (line, fileOffset) {
      variants.push(tbiVCFParser.parseLine(line));
    });
    const endTime = performance.now();
    const elapsedTime = endTime - startTime;
    const elapsedSeconds = elapsedTime / 1000;

    resultsElement.innerHTML = `Retrieved ${variants.length} variant(s) in ${elapsedSeconds.toFixed(2)} s\n`;
    resultsElement.innerHTML += JSON.stringify(variants, null, 2);

    console.log(tbiVCFParser);
    console.log(variants);
    console.table(variants);
  } catch (e) {
    console.error(e);
    resultsElement.innerHTML = e.toString();
  } finally {
    // re-enable submit button
    form.submit.disabled = false;
  }
};
