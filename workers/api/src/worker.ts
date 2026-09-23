import { handleRequest } from "./index";

const worker = {
  fetch(request: Request) {
    return handleRequest(request);
  },
};

export default worker;
