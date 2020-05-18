export type ConfigFile = {
  datasource: string;
  depName: string;
  versioning?: string;
  startVersion: string;
  ignoredVersions?: string[];
  image: string;
  forceUnstable?: boolean;
  versions?: string[];
  latestVersion?: string;
};

export type Config = {
  ignoredVersions: string[];
  lastOnly: boolean;
  dryRun: boolean;
} & ConfigFile;
