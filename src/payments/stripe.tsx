import React, { type ReactElement } from 'react';

export function StripePaymentProvider({children}:{children:ReactElement|ReactElement[];publishableKey:string;merchantIdentifier:string}){
  return <>{children}</>;
}

export async function checkApplePaySupport(){return false}

export async function confirmApplePayReservation(_clientSecret:string,_venueName:string,_amount:string):Promise<void>{
  throw new Error('Apple Pay is available in the iOS development build.');
}

export function ApplePayReservationButton(_props:{onPress:()=>void}){return null}
