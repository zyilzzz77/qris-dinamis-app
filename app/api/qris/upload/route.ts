import { handleQrisUploadRequest } from "./controller";

export async function POST(request: Request) {
    return handleQrisUploadRequest(request);
}
