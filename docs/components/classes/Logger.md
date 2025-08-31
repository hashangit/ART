[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / Logger

# Class: Logger

Defined in: [src/utils/logger.ts:49](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/utils/logger.ts#L49)

A simple static logger class for outputting messages to the console at different levels.

## Remarks

Configuration is global via the static `configure` method.

 Logger

## Constructors

### Constructor

> **new Logger**(): `Logger`

#### Returns

`Logger`

## Methods

### configure()

> `static` **configure**(`config`): `void`

Defined in: [src/utils/logger.ts:59](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/utils/logger.ts#L59)

Configures the static logger settings.

#### Parameters

##### config

`Partial`\<[`LoggerConfig`](../interfaces/LoggerConfig.md)\>

A partial `LoggerConfig` object. Provided settings will override defaults.

#### Returns

`void`

***

### debug()

> `static` **debug**(`message`, ...`args`): `void`

Defined in: [src/utils/logger.ts:72](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/utils/logger.ts#L72)

Logs a message at the DEBUG level.

#### Parameters

##### message

`string`

The main log message string.

##### args

...`any`[]

Additional arguments to include in the console output (e.g., objects, arrays).

#### Returns

`void`

#### Remarks

Only outputs if the configured log level is DEBUG.

***

### error()

> `static` **error**(`message`, ...`args`): `void`

Defined in: [src/utils/logger.ts:120](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/utils/logger.ts#L120)

Logs a message at the ERROR level.

#### Parameters

##### message

`string`

The main log message string.

##### args

...`any`[]

Additional arguments to include in the console output (often an error object).

#### Returns

`void`

#### Remarks

Outputs if the configured log level is ERROR, WARN, INFO, or DEBUG.

***

### info()

> `static` **info**(`message`, ...`args`): `void`

Defined in: [src/utils/logger.ts:88](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/utils/logger.ts#L88)

Logs a message at the INFO level.

#### Parameters

##### message

`string`

The main log message string.

##### args

...`any`[]

Additional arguments to include in the console output.

#### Returns

`void`

#### Remarks

Outputs if the configured log level is INFO or DEBUG.

***

### warn()

> `static` **warn**(`message`, ...`args`): `void`

Defined in: [src/utils/logger.ts:104](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/utils/logger.ts#L104)

Logs a message at the WARN level.

#### Parameters

##### message

`string`

The main log message string.

##### args

...`any`[]

Additional arguments to include in the console output.

#### Returns

`void`

#### Remarks

Outputs if the configured log level is WARN, INFO, or DEBUG.
