import React, { type ReactElement } from 'react';
import { PlatformPay, PlatformPayButton, StripeProvider, confirmPlatformPayPayment, isPlatformPaySupported } from '@stripe/stripe-react-native';

export function StripePaymentProvider({children,publishableKey,merchantIdentifier}:{children:ReactElement|ReactElement[];publishableKey:string;merchantIdentifier:string}){
  return <StripeProvider publishableKey={publishableKey} merchantIdentifier={merchantIdentifier}>{children}</StripeProvider>;
}

export async function checkApplePaySupport(){return isPlatformPaySupported()}

export async function confirmApplePayReservation(clientSecret:string,venueName:string,amount:string):Promise<void>{
  const {error}=await confirmPlatformPayPayment(clientSecret,{
    applePay:{
      cartItems:[
        {label:`Reservation · ${venueName}`,amount,paymentType:PlatformPay.PaymentType.Immediate},
        {label:'DestinyOne Date Reservation',amount,paymentType:PlatformPay.PaymentType.Immediate},
      ],
      merchantCountryCode:'US',
      currencyCode:'USD',
    },
  });
  if(error)throw new Error(error.message);
}

export function ApplePayReservationButton({onPress}:{onPress:()=>void}){
  return <PlatformPayButton type={PlatformPay.ButtonType.Order} appearance={PlatformPay.ButtonStyle.Black} borderRadius={16} onPress={onPress} style={{width:'100%',height:52}}/>;
}
