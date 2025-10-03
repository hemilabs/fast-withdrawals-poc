import { useReducer } from "react";
import { sanitizeAmount } from "utils/form";
import { type Chain } from "viem";
import { hemi } from "viem/chains";

// the _:never is used to fail compilation if a case is missing
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const compilationError = function (_: never): never {
  throw new Error("Missing implementation of action in reducer");
};

export type TunnelState = {
  fromInput: string;
  fromNetworkId: Chain["id"];
};

type Action<T extends string> = {
  type: T;
};

type NoPayload = { payload?: never };
type Payload<T> = { payload: T };

type ResetStateAfterOperation = Action<"resetStateAfterOperation"> & NoPayload;
type UpdateFromInput = Action<"updateFromInput"> & Payload<string>;

export type TunnelActions = ResetStateAfterOperation | UpdateFromInput;

const reducer = function (
  state: TunnelState,
  action: TunnelActions,
): TunnelState {
  const { type } = action;
  switch (type) {
    case "resetStateAfterOperation":
      return {
        ...state,
        fromInput: "0",
      };
    case "updateFromInput": {
      const { error, value } = sanitizeAmount(action.payload);
      if (error) {
        return state;
      }
      return {
        ...state,
        fromInput: value!,
      };
    }

    default:
      // if a switch statement is missing on all possible actions
      // this will fail on compile time
      return compilationError(type);
  }
};

export const useBridgeState = () =>
  useReducer(reducer, {
    fromInput: "0",
    fromNetworkId: hemi.id,
  });
