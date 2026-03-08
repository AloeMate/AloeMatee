# Shared Types

TypeScript type definitions shared between mobile app and other TypeScript packages.

## Usage

In mobile app:

```typescript
import { DiseaseResponse, TreatmentResponse } from '@shared/types';
```

## Files

- `index.ts` - Main API type definitions
- `navigation.ts` - React Navigation type definitions

## Adding New Types

1. Add interface/type in appropriate file
2. Export from that file
3. Types are automatically available in mobile app via path mapping
