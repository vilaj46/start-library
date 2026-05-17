import { z } from "zod";


export const jsonValueSchema: any = z.lazy(() =>
    z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
        z.array(z.lazy(() => jsonValueSchema)),
        z.record(z.string(), z.lazy(() => jsonValueSchema)),
    ])
);
