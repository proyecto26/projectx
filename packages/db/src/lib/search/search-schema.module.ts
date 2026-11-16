import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma.module";
import { SearchRepositoryService } from "./search-repository.service";

@Module({
  imports: [PrismaModule],
  exports: [SearchRepositoryService],
  providers: [SearchRepositoryService],
})
export class SearchSchemaModule {}
