from starlette.staticfiles import StaticFiles
from starlette.responses import FileResponse

class NoCacheStaticFiles(StaticFiles):
    def file_response(self, full_path, stat_result, scope, status_code=200):
        response=FileResponse(
            full_path,
            status_code=status_code,
            stat_result=stat_result,
        )
        response.headers["Cache-Control"]="no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"]="no-cache"
        response.headers["Expires"]="0"
        response.headers["X-GRIDSHARD-Cache"]="disabled"
        return response
