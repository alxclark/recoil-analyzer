## Recoil analyzer

This repository contains a script to analyze a directory and search for all files named `atoms.ts`. For each file found, the script uses the Typescript parser to find all Recoil selectors and atoms and will report dependencies between atoms and selectors.

## Gettings started

```
pnpm install
pnpm run collect
```

The script will log tuples on the screen in the following format:

```
<selector-name> <dependency-name>
```

## Visualizing

The simplest way to visualize at the moment is by running the script, copying the entier output in your terminal and dumping it in the Graph Data section of https://csacademy.com/app/graph_editor/.