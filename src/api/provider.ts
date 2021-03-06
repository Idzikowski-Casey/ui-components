import { createContext, useState, useContext, Context } from "react";
import h from "react-hyperscript";
import { memoize } from "underscore";
import axios, { AxiosPromise } from "axios";
import useAsyncEffect from "use-async-effect";
import { debounce } from "underscore";
import { APIConfig, APIOptions, ResponseUnwrapper } from "./types";
import { buildQueryURL, QueryParams } from "../util/query-string";

type APIBase = { baseURL: string };
type APIContextValue = APIConfig & APIBase;
type APIProviderProps = APIBase &
  APIOptions & {
    context?: Context<APIContextValue>;
    children?: React.ReactChild;
  };

type APIContextType = Context<APIContextValue>;

const apiDefaults: APIConfig = {
  fullResponse: false,
  handleError: true,
  memoize: false,
  onError(err, opts) {
    let error = opts.error ?? opts;
    throw error;
  },
  onResponse(_) {},
  unwrapResponse(d) {
    return d;
  }
};

function createAPIContext(
  defaultProps: Partial<APIContextValue> = {}
): APIContextType {
  return createContext<APIContextValue>({
    baseURL: "",
    ...apiDefaults,
    ...defaultProps
  });
}

const APIContext = createAPIContext();

async function handleResult(promise: AxiosPromise, route, url, method, opts) {
  let res;
  const { onError } = opts;
  try {
    res = await promise;
    opts.onResponse(res);
    const { data } = res;
    if (data == null) {
      throw res.error || "No data!";
    }
    return opts.unwrapResponse(data);
  } catch (err) {
    if (!opts.handleError) {
      throw err;
    }
    console.error(err);
    onError(route, {
      error: err,
      response: res,
      endpoint: url,
      method
    });
    return null;
  }
}

const APIHelpers = (ctx: APIContextValue) => ({
  buildURL(route: string = "", params = {}) {
    const { baseURL } = ctx;
    if (
      !(
        route.startsWith(baseURL) ||
        route.startsWith("http") ||
        route.startsWith("//")
      )
    ) {
      route = baseURL + route;
    }
    return buildQueryURL(route, params);
  },
  processOptions(opts: APIOptions = {}): APIConfig {
    let o1: APIConfig = { ...ctx, ...opts };
    if (o1.fullResponse) o1.unwrapResponse = apiDefaults.unwrapResponse;
    return o1;
  }
});

interface APIActions {
  post(
    route: string,
    params: QueryParams,
    payload: any,
    opts: APIOptions
  ): Promise<any | null>;
  post(route: string, payload: any, opts?: APIOptions): Promise<any | null>;
  get(
    route: string,
    params: QueryParams,
    opts: APIOptions
  ): Promise<any | null>;
  get(route: string, opts?: APIOptions): Promise<any | null>;
}

const APIActions = (ctx: APIContextValue): APIActions => {
  const { processOptions, buildURL } = APIHelpers(ctx);
  return {
    post(route: string, ...args) {
      let opts: APIOptions, params: QueryParams, payload: any;
      if (args.length === 3) {
        [params, payload, opts] = args;
      } else if (args.length === 2) {
        [payload, opts] = args;
      } else if (args.length === 1) {
        [payload] = args;
      } else {
        throw "No data to post";
      }

      const url = buildURL(route, params ?? {});
      opts = processOptions(opts ?? {});

      return handleResult(axios.post(url, payload), route, url, "POST", opts);
    },
    get(route: string, ...args) {
      let params: QueryParams, opts: APIOptions;
      if (args.length == 1) {
        [opts] = args;
      } else if (args.length == 2) {
        [params, opts] = args;
      }

      const url = buildURL(route, params ?? {});
      opts = processOptions(opts ?? {});

      let fn = axios.get;
      if (opts.memoize) {
        fn = memoize(axios.get);
      }
      return handleResult(fn(url), route, url, "GET", opts);
    }
  };
};

const APIProvider = (props: APIProviderProps) => {
  /** Provider for APIContext

  can pass an alternative API context using "context" param
  */
  const { children, context, ...rest } = props;
  const value = { ...apiDefaults, ...rest };
  return h((context ?? APIContext).Provider, { value }, children);
};

const useAPIActions = (ctx: APIContextType = APIContext) => {
  return APIActions(useContext(ctx));
};

const useAPIHelpers = (ctx: APIContextType = APIContext) => {
  return APIHelpers(useContext(ctx));
};

type APIHookOpts = Partial<
  APIConfig & {
    debounce?: number;
    context?: APIContextType;
  }
>;

const useAPIResult = function<T>(
  route: string | null,
  params: QueryParams = {},
  opts: APIHookOpts | ResponseUnwrapper<any, T> = {}
): T {
  /* React hook for API results */
  const deps = [route, ...Object.values(params ?? {})];

  const [result, setResult] = useState<T | null>(null);

  if (typeof opts === "function") {
    opts = { unwrapResponse: opts };
  }

  const { debounce: _debounce, context, ...rest } = opts ?? {};
  let { get } = useAPIActions(context);

  const _getAPIData = async function() {
    if (route == null) {
      return setResult(null);
    }
    const res = await get(route, params, rest);
    return setResult(res);
  };

  const getAPIData =
    _debounce != null ? debounce(_getAPIData, _debounce) : _getAPIData;

  useAsyncEffect(getAPIData, deps);
  return result;
};

export {
  createAPIContext,
  APIContext,
  APIProvider,
  APIActions,
  APIHelpers,
  useAPIActions,
  useAPIResult,
  useAPIHelpers
};
