# Finch Money Dashboard

A responsive finance dashboard demo with fictional INR transactions. It includes balances, monthly cash flow, category spending, editable budgets, and searchable, addable, removable transactions.

The hosted version stores edits in this browser's `localStorage`; each browser has its own private demo copy. The local Node.js version stores data in `data/dashboard.json`. No bank accounts or credentials are connected.

## Run locally

Open `index.html` in a browser for the browser-storage demo, or use the full local Node.js server in the parent project folder.

## Publish

The included GitHub Actions workflow publishes these static files to GitHub Pages on pushes to `main`.
