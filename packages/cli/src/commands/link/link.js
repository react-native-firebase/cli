/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {pick} from 'lodash';
import {logger, CLIError} from '@react-native-community/cli-tools';
import {type ConfigT} from 'types';
import getPlatformName from './getPlatformName';
import linkDependency from './linkDependency';
import linkAssets from './linkAssets';
import linkAll from './linkAll';

type FlagsType = {
  platforms?: Array<string>,
};

/**
 * Updates project and links all dependencies to it.
 *
 * @param args If optional argument [packageName] is provided,
 *             only that package is processed.
 */
async function link(
  [rawPackageName]: Array<string>,
  ctx: ConfigT,
  opts: FlagsType,
) {
  let platforms = ctx.platforms;
  let project = ctx.project;

  if (opts.platforms) {
    platforms = pick(platforms, opts.platforms);
    logger.debug('Skipping selected platforms');
  }

  logger.debug(
    'Available platforms: ' +
      `${Object.keys(platforms)
        .map(getPlatformName)
        .join(', ')}`,
  );

  if (rawPackageName === undefined) {
    logger.debug(
      'No package name provided, will attempt to link all possible packages.',
    );
    return linkAll(ctx);
  }

  // Trim the version / tag out of the package name (eg. package@latest)
  const packageName = rawPackageName.replace(/^(.+?)(@.+?)$/gi, '$1');

  if (!Object.keys(ctx.dependencies).includes(packageName)) {
    throw new CLIError(`
      Unknown dependency. Make sure that the package you are trying to link is
      already installed in your "node_modules" and present in your "package.json" dependencies.
    `);
  }

  const {[packageName]: dependency} = ctx.dependencies;

  logger.debug(`Package to link: ${rawPackageName}`);

  try {
    if (dependency.hooks.prelink) {
      await dependency.hooks.prelink();
    }
    await linkDependency(platforms, project, dependency);
    if (dependency.hooks.postlink) {
      await dependency.hooks.postlink();
    }
    await linkAssets(platforms, project, dependency.assets);
  } catch (error) {
    throw new CLIError(
      `Something went wrong while linking. Reason: ${error.message}`,
      error,
    );
  }
}

export const func = link;

export default {
  func: link,
  description: 'scope link command to certain platforms (comma-separated)',
  name: 'link [packageName]',
  options: [
    {
      command: '--platforms [list]',
      description:
        'If you want to link dependencies only for specific platforms',
      parse: (val: string) => val.toLowerCase().split(','),
    },
  ],
};
