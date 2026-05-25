FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore "src/LoadForge.Api/LoadForge.Api.csproj"
RUN dotnet publish "src/LoadForge.Api/LoadForge.Api.csproj" \
    -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "LoadForge.Api.dll"]
