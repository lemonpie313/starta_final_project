import { PickType } from '@nestjs/swagger';
import { Community } from '../entities/community.entity';

export class UpdateCommunityDto extends PickType(Community, ['communityName', 'membershipPrice']) {}
