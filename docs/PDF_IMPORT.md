# PDF Import Troubleshooting

The status beside the Import button reports each stage.

- **Choose a BMW program PDF…**: the file picker opened.
- **Loading PDF reader…**: PDF.js is downloading.
- **Reading page X of Y…**: the file is being parsed.
- **N rows ready for review**: the review dialog should be open.
- **No rows detected**: the PDF opened, but its table layout did not match the importer.
- **Import failed**: open the browser console for the detailed error.

The first import requires internet access so the browser can load the PDF.js module from jsDelivr.
