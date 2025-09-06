[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ZyntopiaOAuthConfig

# Interface: ZyntopiaOAuthConfig

Defined in: [src/auth/ZyntopiaOAuthStrategy.ts:7](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/auth/ZyntopiaOAuthStrategy.ts#L7)

Configuration specific to Zyntopia OAuth strategy

## Properties

### clientId

> **clientId**: `string`

Defined in: [src/auth/ZyntopiaOAuthStrategy.ts:9](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/auth/ZyntopiaOAuthStrategy.ts#L9)

Client ID for Zyntopia OAuth authentication

***

### clientSecret

> **clientSecret**: `string`

Defined in: [src/auth/ZyntopiaOAuthStrategy.ts:11](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/auth/ZyntopiaOAuthStrategy.ts#L11)

Client secret for Zyntopia OAuth authentication

***

### customHeaders?

> `optional` **customHeaders**: `Record`\<`string`, `string`\>

Defined in: [src/auth/ZyntopiaOAuthStrategy.ts:23](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/auth/ZyntopiaOAuthStrategy.ts#L23)

Additional custom headers for Zyntopia API requirements

***

### environment?

> `optional` **environment**: `"production"` \| `"staging"` \| `"development"`

Defined in: [src/auth/ZyntopiaOAuthStrategy.ts:17](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/auth/ZyntopiaOAuthStrategy.ts#L17)

Optional environment ('production' | 'staging' | 'development')

***

### scopes?

> `optional` **scopes**: `string`

Defined in: [src/auth/ZyntopiaOAuthStrategy.ts:15](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/auth/ZyntopiaOAuthStrategy.ts#L15)

Optional custom scopes (defaults to Zyntopia's standard scopes)

***

### tokenEndpoint?

> `optional` **tokenEndpoint**: `string`

Defined in: [src/auth/ZyntopiaOAuthStrategy.ts:13](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/auth/ZyntopiaOAuthStrategy.ts#L13)

Optional custom token endpoint (defaults to Zyntopia's standard endpoint)

***

### tokenRefreshBufferMs?

> `optional` **tokenRefreshBufferMs**: `number`

Defined in: [src/auth/ZyntopiaOAuthStrategy.ts:21](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/auth/ZyntopiaOAuthStrategy.ts#L21)

Optional custom buffer time before token expiry to trigger refresh

***

### tokenTimeoutMs?

> `optional` **tokenTimeoutMs**: `number`

Defined in: [src/auth/ZyntopiaOAuthStrategy.ts:19](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/auth/ZyntopiaOAuthStrategy.ts#L19)

Optional custom timeout for token requests in milliseconds
