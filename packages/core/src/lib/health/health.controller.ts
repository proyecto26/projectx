import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  HealthCheck,
  type HealthCheckService,
  type MemoryHealthIndicator,
  type PrismaHealthIndicator,
} from "@nestjs/terminus";
import type { PrismaService } from "@projectx/db";

const MEMORY_HEAP_LIMIT = 512 * 1024 * 1024; // 512MB
const MEMORY_RSS_LIMIT = 512 * 1024 * 1024; // 512MB

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Perform a health check on the application.
   *
   * This endpoint checks the health of the database connection and memory usage.
   *
   * @returns A JSON object containing the health status of the application.
   */
  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: "Check application health",
    description: "Performs a health check on the database and memory usage.",
  })
  @ApiResponse({ status: 200, description: "Health check successful." })
  @ApiResponse({ status: 503, description: "Service Unavailable." })
  @HttpCode(HttpStatus.OK)
  check() {
    return this.health.check([
      async () => this.prismaHealth.pingCheck("db", this.prismaService),
      async () => this.memory.checkHeap("memory_heap", MEMORY_HEAP_LIMIT),
      async () => this.memory.checkRSS("memory_rss", MEMORY_RSS_LIMIT),
    ]);
  }
}
