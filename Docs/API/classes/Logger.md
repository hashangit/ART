[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / Logger

# Class: Logger

Defined in: [utils/logger.ts:29](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/utils/logger.ts#L29)

A simple static logger class for outputting messages to the console at different levels.
Configuration is global via the static `configure` method.

## Constructors

### Constructor

> **new Logger**(): `Logger`

#### Returns

`Logger`

## Methods

### configure()

> `static` **configure**(`config`): `void`

Defined in: [utils/logger.ts:38](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/utils/logger.ts#L38)

Configures the static logger settings.

#### Parameters

##### config

`Partial`\<`LoggerConfig`\>

A partial `LoggerConfig` object. Provided settings will override defaults.

#### Returns

`void`

***

### debug()

> `static` **debug**(`message`, ...`args`): `void`

Defined in: [utils/logger.ts:48](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/utils/logger.ts#L48)

Logs a message at the DEBUG level.
Only outputs if the configured log level is DEBUG.

#### Parameters

##### message

`string`

The main log message string.

##### args

...`any`[]

Additional arguments to include in the console output (e.g., objects, arrays).

#### Returns

`void`

***

### error()

> `static` **error**(`message`, ...`args`): `void`

Defined in: [utils/logger.ts:84](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/utils/logger.ts#L84)

Logs a message at the ERROR level.
Outputs if the configured log level is ERROR, WARN, INFO, or DEBUG.

#### Parameters

##### message

`string`

The main log message string.

##### args

...`any`[]

Additional arguments to include in the console output (often an error object).

#### Returns

`void`

***

### info()

> `static` **info**(`message`, ...`args`): `void`

Defined in: [utils/logger.ts:60](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/utils/logger.ts#L60)

Logs a message at the INFO level.
Outputs if the configured log level is INFO or DEBUG.

#### Parameters

##### message

`string`

The main log message string.

##### args

...`any`[]

Additional arguments to include in the console output.

#### Returns

`void`

***

### warn()

> `static` **warn**(`message`, ...`args`): `void`

Defined in: [utils/logger.ts:72](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/utils/logger.ts#L72)

Logs a message at the WARN level.
Outputs if the configured log level is WARN, INFO, or DEBUG.

#### Parameters

##### message

`string`

The main log message string.

##### args

...`any`[]

Additional arguments to include in the console output.

#### Returns

`void`
