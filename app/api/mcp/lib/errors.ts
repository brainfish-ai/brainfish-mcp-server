import { NextResponse } from 'next/server';
import { BrainfishApiError } from '@/src/client';

export function handleBrainfishError(error: unknown) {
  if (error instanceof BrainfishApiError) {
    return NextResponse.json(
      {
        error: error.code,
        message: error.message,
        statusCode: error.statusCode,
        ...(error.requestId && { requestId: error.requestId }),
        ...(error.validationErrors && {
          validationErrors: error.validationErrors,
        }),
      },
      { status: error.statusCode },
    );
  }

  return NextResponse.json(
    {
      error: 'unknown_error',
      message:
        error instanceof Error
          ? error.message
          : 'An unknown error occurred',
    },
    { status: 500 },
  );
}
