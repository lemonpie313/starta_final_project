import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateMerchandiseDto } from './dto/create-merchandise-post.dto';
import { MerchandisePost } from './entities/merchandise-post.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { MerchandiseImage } from './entities/merchandise-image.entity';
import { Product } from 'src/product/entities/product.entity';
import { NotFoundError } from 'rxjs';
import { MerchandiseOption } from './entities/marchandise-option.entity';
import { FindAllmerchandiseDto } from './dto/find-merchandise.dto';
import { UpdateMerchandiseDto } from './dto/update-merchandise.dto';
import { title } from 'process';
import * as Flatted from 'flatted';
import { Manager } from 'src/admin/entities/manager.entity';

@Injectable()
export class MerchandiseService {
  constructor(
    @InjectRepository(MerchandisePost)
    private readonly merchandiseRepository: Repository<MerchandisePost>,
    @InjectRepository(MerchandiseImage)
    private readonly merchandiseImageRepository: Repository<MerchandiseImage>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(MerchandiseOption)
    private readonly merchandiseOptionRepository: Repository<MerchandiseOption>,
    @InjectRepository(Manager)
    private readonly managerRepository: Repository<Manager>,
  ) {}

  // 상품 생성 API
  async create(createMerchandiseDto: CreateMerchandiseDto, userId: number) {
    const { productId, imageUrl, option, optionPrice, ...merchandiseData } =
      createMerchandiseDto;

    // 상점 유효성 체크
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('상점이 존재하지 않습니다');
    }

    // 옵션 + 옵션명 수 동일 체크
    if (option.length !== optionPrice.length) {
      throw new BadRequestException(
        '옵션명과 옵션 가격의 수가 일치하지 않습니다',
      );
    }

    // 상품 이름 중복 체크
    const merchandiseNameCheck = await this.merchandiseRepository.findOne({
      where: { title: createMerchandiseDto.title },
    });
    if (merchandiseNameCheck) {
      throw new BadRequestException('이미 존재하는 상품 이름입니다.');
    }
    //매니저 정보 가져오기
    const manager = await this.managerRepository.findOne({
      where: { userId },
    });

    // 상점 아이디가 있을 경우 생성
    const merchandise = await this.merchandiseRepository.create({
      ...merchandiseData,
      product,
      manager,
    });
    const saveMerchandise = await this.merchandiseRepository.save(merchandise);

    //상품 생성 후 이미지 데이터 저장
    const saveImage = await this.merchandiseImageRepository.save(
      imageUrl.map((url) => ({
        url,
        merchandisePost: saveMerchandise,
      })),
    );

    //상품 생성 후 옵션 데이터 저장
    const saveOption = await this.merchandiseOptionRepository.save(
      option.map((optionName, price) => ({
        optionName,
        optionPrice: optionPrice[price],
        merchandisePost: saveMerchandise,
      })),
    );

    return {
      status: HttpStatus.CREATED,
      message: '상품 생성이 완료되었습니다',
      data: {
        merchandiseId: merchandise.id,
        managerId: manager.managerId,
        title: merchandise.title,
        thumbnail: merchandise.thumbnail,
        salesName: merchandise.salesName,
        content: merchandise.content,
        deliveryPrice: merchandise.deliveryPrice,
        createdAt: merchandise.createdAt,
        updatedAt: merchandise.updatedAt,
        product: {
          productId: merchandise.product.id,
          productName: merchandise.product.name,
        },
        option: { option, optionPrice },
      },
    };
  }

  // 상품 조회 API
  async findAll(findAllmerchandiseDto: FindAllmerchandiseDto) {
    const { artist, category } = findAllmerchandiseDto;

    //salesName은 테스트용도 /  artist와 category 업데이트 시 변경 예정
    // 조건에 따라 반환 조건 변경
    let merchandise;
    if (!artist && !category) {
      merchandise = await this.merchandiseRepository.find();
    } else if (artist && category) {
      merchandise = await this.merchandiseRepository.find({
        where: [
          { salesName: Like(`%${artist}%`), content: Like(`%${category}%`) },
        ],
        relations: ['merchandiseOption'],
      });
    } else if (artist) {
      merchandise = await this.merchandiseRepository.find({
        where: { salesName: Like(`%${artist}%`) },
        relations: ['merchandiseOption'],
      });
    } else if (category) {
      merchandise = await this.merchandiseRepository.find({
        where: { salesName: Like(`%${category}%`) },
        relations: ['merchandiseOption'],
      });
    }

    const data = merchandise.map((merchandises) => ({
      id: merchandises.id,
      title: merchandises.title,
      category: '추가 시 수정 예정',
      artist: '추가 시 수정 예정',
      thumbnail: merchandises.thumbnail,
      salesName: merchandises.salesName,
      content: merchandises.content,
      deliveryPrice: merchandises.deliveryPrice,
      createdAt: merchandises.createdAt,
      updatedAt: merchandises.updatedAt,
      // merchandiseOption: merchandises.merchandiseOption << 옵션은 상세 조회에서?
    }));

    return {
      status: HttpStatus.OK,
      message: `카테고리 : ${category} / 아티스트 : ${artist} 상품 전체 조회가 완료되었습니다`,
      data,
    };
  }

  // 상품 상세 조회 API
  async findOne(merchandiseId: number) {
    // 상품 유효 체크
    const merchandise = await this.merchandiseRepository.findOne({
      where: { id: merchandiseId },
      relations: ['merchandiseImage', 'merchandiseOption'],
    });

    if (!merchandise) {
      throw new NotFoundException('존재하지 않는 상품입니다.');
    }

    return {
      status: HttpStatus.OK,
      message: '상품 상세 조회에 성공하였습니다.',
      data: merchandise,
    };
  }

  // 상품 수정 API
  async update(
    id: number,
    updateMerchandiseDto: UpdateMerchandiseDto,
    userId: number,
  ) {
    const {
      title,
      thumbnail,
      salesName,
      content,
      deliveryPrice,
      imageUrl,
      optionName,
      optionPrice,
    } = updateMerchandiseDto;

    //상품 유효성 체크
    const merchandise = await this.merchandiseRepository.findOne({
      where: { id },
      relations: ['merchandiseImage', 'merchandiseOption', 'manager'],
    });
    if (!merchandise) {
      throw new NotFoundException('존재하지 않는 상품입니다.');
    }

    // product 생성자와 수정 요청한 사용자가 일치한지 확인
    if (merchandise.manager.userId !== userId) {
      throw new ForbiddenException('수정 권한이 없습니다.');
    }

    if (title !== undefined) {
      merchandise.title = title;
    }
    if (thumbnail !== undefined) {
      merchandise.thumbnail = thumbnail;
    }
    if (salesName !== undefined) {
      merchandise.salesName = salesName;
    }
    if (content !== undefined) {
      merchandise.content = content;
    }
    if (deliveryPrice !== undefined) {
      merchandise.deliveryPrice = deliveryPrice;
    }

    await this.merchandiseRepository.save(merchandise);

    //이미지 입력경우
    if (imageUrl !== undefined) {
      // 기존 이미지 삭제
      await this.merchandiseImageRepository.delete({
        merchandisePost: merchandise,
      });

      // 이미지 재생성
      await this.merchandiseImageRepository.save(
        imageUrl.map((url) => ({
          url,
          merchandisePost: merchandise,
        })),
      );
    }

    // 옵션+가격 있을 경우, 입력한 값의 수가 일치한지 확인
    if (optionName !== undefined && optionPrice !== undefined) {
      if (optionName.length !== optionPrice.length) {
        throw new BadRequestException(
          '옵션명과 옵션 가격의 수가 일치하지 않습니다',
        );
      }

      // 기존 옵션 삭제
      await this.merchandiseOptionRepository.delete({
        merchandisePost: merchandise,
      });

      // 옵션 재생성
      await this.merchandiseOptionRepository.save(
        optionName.map((optionName, price) => ({
          optionName,
          optionPrice: optionPrice[price],
          merchandisePost: merchandise,
        })),
      );
    }

    return {
      status: HttpStatus.OK,
      message: '수정 완료되었습니다.',
      merchandise,
    };
  }

  //상품 삭제 API
  async remove(merchandiseId: number, userId: number) {
    const merchandise = await this.merchandiseRepository.findOne({
      where: { id: merchandiseId },
      relations: ['merchandiseImage', 'merchandiseOption', 'manager'],
    });

    if (!merchandise) {
      throw new NotFoundException('존재하지 않는 상품입니다.');
    }

    // product 생성자와 수정 요청한 사용자가 일치한지 확인
    if (merchandise.manager.userId !== userId) {
      throw new ForbiddenException('수정 권한이 없습니다.');
    }

    await this.merchandiseRepository.delete(merchandise.id);

    return {
      status: HttpStatus.OK,
      message: '상품 삭제에 성공하였습니다.',
      data: { id: merchandiseId },
    };
  }
}
